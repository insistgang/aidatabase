from __future__ import annotations

import csv
import io
import json
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field, model_validator

from security import (
    EventRateLimiter,
    prune_event_history,
    sanitize_csv_cell,
    validate_event_payload,
)


DATA_DIR = Path(os.environ.get("DATA_DIR", "/var/lib/aidatabase-learning"))
DB_PATH = DATA_DIR / "learning.db"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
EVENT_RATE_LIMIT_PER_MINUTE = max(
    1, int(os.environ.get("EVENT_RATE_LIMIT_PER_MINUTE", "120"))
)
MAX_EVENT_REQUEST_BYTES = max(
    1024, int(os.environ.get("MAX_EVENT_REQUEST_BYTES", "16384"))
)
MAX_STORED_EVENTS = max(1, int(os.environ.get("MAX_STORED_EVENTS", "200000")))

app = FastAPI(title="Aidatabase Learning API")
event_rate_limiter = EventRateLimiter(
    limit=EVENT_RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
)


class LearningEvent(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    session_id: str = Field(min_length=1, max_length=128)
    student_name: Optional[str] = Field(default=None, max_length=128)
    level_id: Optional[int] = None
    level_name: Optional[str] = Field(default=None, max_length=128)
    question_id: Optional[int] = None
    selected_answer: Optional[int] = None
    correct: Optional[bool] = None
    time_taken: Optional[float] = None
    score: Optional[int] = None
    lives: Optional[int] = None
    correct_count: Optional[int] = None
    total_questions: Optional[int] = None
    passed: Optional[bool] = None
    metadata: Optional[dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_payload(self) -> "LearningEvent":
        validate_event_payload(self.model_dump())
        return self


@app.middleware("http")
async def limit_event_request_size(request: Request, call_next: Any) -> Any:
    if request.url.path == "/learning-api/events":
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_EVENT_REQUEST_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length"},
                )
    return await call_next(request)


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
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return ""


def bool_to_int(value: Optional[bool]) -> Optional[int]:
    if value is None:
        return None
    return 1 if value else 0


def require_admin(x_admin_token: Optional[str]) -> None:
    token = x_admin_token or ""
    if not ADMIN_TOKEN or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/learning-api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/learning-api/events")
def create_event(event: LearningEvent, request: Request) -> dict[str, str]:
    request_ip = client_ip(request)
    if not event_rate_limiter.allow(request_ip, now=time.monotonic()):
        raise HTTPException(
            status_code=429,
            detail="Too many event requests",
            headers={"Retry-After": "60"},
        )

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
                request_ip,
                request.headers.get("user-agent", ""),
                metadata,
            ),
        )
        prune_event_history(conn, MAX_STORED_EVENTS)
    return {"status": "ok"}


@app.get("/learning-api/stats")
def stats(x_admin_token: Optional[str] = Header(default=None)) -> dict[str, Any]:
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
def export_csv(x_admin_token: Optional[str] = Header(default=None)) -> PlainTextResponse:
    require_admin(x_admin_token)
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
            writer.writerow([sanitize_csv_cell(row[key]) for key in headers])

    return PlainTextResponse(
        output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=learning-events.csv"},
    )
