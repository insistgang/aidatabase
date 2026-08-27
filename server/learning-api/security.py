from __future__ import annotations

import json
import threading
from collections import OrderedDict, deque
from collections.abc import Mapping
from typing import Any


ALLOWED_EVENT_TYPES = {
    "visit",
    "game_started",
    "level_started",
    "answer",
    "level_result",
    "victory",
}
MAX_METADATA_BYTES = 4096

NUMBER_RANGES = {
    "level_id": (1, 1000),
    "question_id": (1, 1_000_000),
    "selected_answer": (-1, 100),
    "time_taken": (0, 3600),
    "score": (0, 10_000_000),
    "lives": (0, 10_000),
    "correct_count": (0, 10_000),
    "total_questions": (0, 10_000),
}


def validate_event_payload(payload: Mapping[str, Any]) -> None:
    event_type = payload.get("event_type")
    if event_type not in ALLOWED_EVENT_TYPES:
        raise ValueError("event_type is not supported")

    session_id = payload.get("session_id")
    if not isinstance(session_id, str) or not 1 <= len(session_id) <= 128:
        raise ValueError("session_id must contain 1 to 128 characters")

    for field, (minimum, maximum) in NUMBER_RANGES.items():
        value = payload.get(field)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{field} must be numeric")
        if not minimum <= value <= maximum:
            raise ValueError(f"{field} is outside the allowed range")

    metadata = payload.get("metadata")
    if metadata is None:
        return
    if not isinstance(metadata, dict):
        raise ValueError("metadata must be an object")
    metadata_size = len(
        json.dumps(metadata, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    )
    if metadata_size > MAX_METADATA_BYTES:
        raise ValueError("metadata is too large")


class EventRateLimiter:
    def __init__(
        self,
        limit: int,
        window_seconds: float,
        max_clients: int = 10_000,
    ) -> None:
        if limit < 1 or window_seconds <= 0 or max_clients < 1:
            raise ValueError("rate limiter settings must be positive")
        self.limit = limit
        self.window_seconds = window_seconds
        self.max_clients = max_clients
        self._requests: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def allow(self, client_key: str, now: float) -> bool:
        cutoff = now - self.window_seconds
        key = client_key or "unknown"

        with self._lock:
            timestamps = self._requests.get(key)
            if timestamps is None:
                if len(self._requests) >= self.max_clients:
                    self._requests.popitem(last=False)
                timestamps = deque()
                self._requests[key] = timestamps
            else:
                self._requests.move_to_end(key)

            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= self.limit:
                return False

            timestamps.append(now)
            return True


def sanitize_csv_cell(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    trimmed = value.lstrip(" \t\r\n")
    if trimmed.startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def prune_event_history(connection: Any, max_events: int) -> None:
    if max_events < 1:
        raise ValueError("max_events must be positive")
    connection.execute(
        """
        DELETE FROM learning_events
        WHERE id <= COALESCE((SELECT MAX(id) FROM learning_events), 0) - ?
        """,
        (max_events,),
    )
