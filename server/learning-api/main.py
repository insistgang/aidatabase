from __future__ import annotations

import csv
import io
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field


DATA_DIR = Path(os.environ.get("DATA_DIR", "/var/lib/aidatabase-learning"))
DB_PATH = DATA_DIR / "learning.db"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")

app = FastAPI(title="Aidatabase Learning API")


class LearningEvent(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    session_id: str = Field(min_length=1, max_length=128)
    student_name: str | None = Field(default=None, max_length=128)
    level_id: int | None = None
    level_name: str | None = Field(default=None, max_length=128)
    question_id: int | None = None
    selected_answer: int | None = None
    correct: bool | None = None
    time_taken: float | None = None
    score: int | None = None
    lives: int | None = None
    correct_count: int | None = None
    total_questions: int | None = None
    passed: bool | None = None
    metadata: dict[str, Any] | None = None


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS learning_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                event_type TEXT NOT NULL,
                session_id TEXT NOT NULL,
                student_name TEXT,
                level_id INTEGER,
                level_name TEXT,
                question_id INTEGER,
                selected_answer INTEGER,
                correct INTEGER,
                time_taken REAL,
                score INTEGER,
                lives INTEGER,
                correct_count INTEGER,
                total_questions INTEGER,
                passed INTEGER,
                ip TEXT,
                user_agent TEXT,
                metadata TEXT
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_created ON learning_events(created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON learning_events(event_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_session ON learning_events(session_id)")


@app.on_event("startup")
def startup() -> None:
    init_db()


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


def bool_to_int(value: bool | None) -> int | None:
    if value is None:
        return None
    return 1 if value else 0


def require_admin(x_admin_token: str | None, token_query: str | None = None) -> None:
    token = x_admin_token or token_query or ""
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/learning-api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/learning-api/events")
def create_event(event: LearningEvent, request: Request) -> dict[str, str]:
    metadata = json.dumps(event.metadata or {}, ensure_ascii=False)
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO learning_events (
                created_at, event_type, session_id, student_name, level_id,
                level_name, question_id, selected_answer, correct, time_taken,
                score, lives, correct_count, total_questions, passed, ip,
                user_agent, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                event.event_type,
                event.session_id,
                event.student_name,
                event.level_id,
                event.level_name,
                event.question_id,
                event.selected_answer,
                bool_to_int(event.correct),
                event.time_taken,
                event.score,
                event.lives,
                event.correct_count,
                event.total_questions,
                bool_to_int(event.passed),
                client_ip(request),
                request.headers.get("user-agent", ""),
                metadata,
            ),
        )
    return {"status": "ok"}


@app.get("/learning-api/stats")
def stats(x_admin_token: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin(x_admin_token)
    with connect() as conn:
        summary = row_to_dict(
            conn.execute(
                """
                SELECT
                    SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) AS visits,
                    COUNT(DISTINCT session_id) AS sessions,
                    COUNT(DISTINCT NULLIF(TRIM(student_name), '')) AS students,
                    SUM(CASE WHEN event_type = 'answer' THEN 1 ELSE 0 END) AS answers,
                    SUM(CASE WHEN event_type = 'answer' AND correct = 1 THEN 1 ELSE 0 END) AS correct_answers,
                    SUM(CASE WHEN event_type = 'level_result' THEN 1 ELSE 0 END) AS level_results,
                    SUM(CASE WHEN event_type = 'level_result' AND passed = 1 THEN 1 ELSE 0 END) AS passed_levels
                FROM learning_events
                """
            ).fetchone()
        )
        summary = {key: int(value or 0) for key, value in summary.items()}

        students = [
            row_to_dict(row)
            for row in conn.execute(
                """
                SELECT
                    COALESCE(NULLIF(TRIM(student_name), ''), '未填写') AS student_name,
                    COUNT(DISTINCT session_id) AS sessions,
                    SUM(CASE WHEN event_type = 'answer' THEN 1 ELSE 0 END) AS answers,
                    SUM(CASE WHEN event_type = 'answer' AND correct = 1 THEN 1 ELSE 0 END) AS correct_answers,
                    MAX(COALESCE(score, 0)) AS best_score,
                    MAX(created_at) AS last_seen
                FROM learning_events
                GROUP BY COALESCE(NULLIF(TRIM(student_name), ''), '未填写')
                ORDER BY last_seen DESC
                LIMIT 200
                """
            )
        ]

        levels = [
            row_to_dict(row)
            for row in conn.execute(
                """
                SELECT
                    level_id,
                    COALESCE(level_name, '未记录关卡') AS level_name,
                    SUM(CASE WHEN event_type = 'answer' THEN 1 ELSE 0 END) AS answers,
                    SUM(CASE WHEN event_type = 'answer' AND correct = 1 THEN 1 ELSE 0 END) AS correct_answers,
                    COALESCE(AVG(CASE WHEN event_type = 'answer' THEN time_taken END), 0) AS average_time,
                    SUM(CASE WHEN event_type = 'level_result' THEN 1 ELSE 0 END) AS results,
                    SUM(CASE WHEN event_type = 'level_result' AND passed = 1 THEN 1 ELSE 0 END) AS passed_results
                FROM learning_events
                WHERE level_id IS NOT NULL
                GROUP BY level_id, COALESCE(level_name, '未记录关卡')
                ORDER BY level_id
                """
            )
        ]

        recent_events = [
            row_to_dict(row)
            for row in conn.execute(
                """
                SELECT
                    id, created_at, event_type, session_id,
                    COALESCE(student_name, '') AS student_name,
                    COALESCE(level_name, '') AS level_name,
                    question_id, selected_answer, correct, time_taken,
                    score, lives, passed, COALESCE(ip, '') AS ip
                FROM learning_events
                ORDER BY id DESC
                LIMIT 120
                """
            )
        ]

    return {
        "summary": summary,
        "students": students,
        "levels": levels,
        "recent_events": recent_events,
    }


@app.get("/learning-api/export.csv", response_class=PlainTextResponse)
def export_csv(
    x_admin_token: str | None = Header(default=None),
    token: str | None = Query(default=None),
) -> PlainTextResponse:
    require_admin(x_admin_token, token)
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "id",
        "created_at",
        "event_type",
        "session_id",
        "student_name",
        "level_id",
        "level_name",
        "question_id",
        "selected_answer",
        "correct",
        "time_taken",
        "score",
        "lives",
        "correct_count",
        "total_questions",
        "passed",
        "ip",
    ]
    writer.writerow(headers)
    with connect() as conn:
        for row in conn.execute(
            """
            SELECT id, created_at, event_type, session_id, student_name,
                   level_id, level_name, question_id, selected_answer,
                   correct, time_taken, score, lives, correct_count,
                   total_questions, passed, ip
            FROM learning_events
            ORDER BY id DESC
            """
        ):
            writer.writerow([row[key] for key in headers])

    return PlainTextResponse(
        output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=learning-events.csv"},
    )
