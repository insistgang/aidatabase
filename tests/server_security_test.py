import sqlite3
import sys
import unittest
from pathlib import Path


SERVER_DIR = Path(__file__).resolve().parents[1] / "server" / "learning-api"
sys.path.insert(0, str(SERVER_DIR))

from security import (
    EventRateLimiter,
    prune_event_history,
    sanitize_csv_cell,
    validate_event_payload,
)


class EventRateLimiterTests(unittest.TestCase):
    def test_rejects_requests_after_limit_within_window(self):
        limiter = EventRateLimiter(limit=2, window_seconds=60)

        self.assertTrue(limiter.allow("203.0.113.10", now=100))
        self.assertTrue(limiter.allow("203.0.113.10", now=101))
        self.assertFalse(limiter.allow("203.0.113.10", now=102))

    def test_allows_requests_again_after_window(self):
        limiter = EventRateLimiter(limit=1, window_seconds=60)

        self.assertTrue(limiter.allow("203.0.113.10", now=100))
        self.assertTrue(limiter.allow("203.0.113.10", now=161))


class EventValidationTests(unittest.TestCase):
    def test_accepts_a_valid_answer_event(self):
        validate_event_payload(
            {
                "event_type": "answer",
                "session_id": "session-1",
                "student_name": "张鑫",
                "level_id": 2,
                "question_id": 10,
                "selected_answer": 1,
                "time_taken": 12.5,
                "score": 100,
                "lives": 4,
                "metadata": {"difficulty": "easy"},
            }
        )

    def test_rejects_unknown_event_types(self):
        with self.assertRaisesRegex(ValueError, "event_type"):
            validate_event_payload(
                {
                    "event_type": "arbitrary_database_event",
                    "session_id": "session-1",
                }
            )

    def test_rejects_out_of_range_numbers(self):
        with self.assertRaisesRegex(ValueError, "time_taken"):
            validate_event_payload(
                {
                    "event_type": "answer",
                    "session_id": "session-1",
                    "time_taken": 1_000_000,
                }
            )

    def test_rejects_oversized_metadata(self):
        with self.assertRaisesRegex(ValueError, "metadata"):
            validate_event_payload(
                {
                    "event_type": "visit",
                    "session_id": "session-1",
                    "metadata": {"payload": "x" * 5000},
                }
            )


class CsvSanitizationTests(unittest.TestCase):
    def test_prefixes_spreadsheet_formulas(self):
        for value in ("=1+1", "+cmd", "-10+20", "@SUM(A1:A2)"):
            with self.subTest(value=value):
                self.assertEqual(sanitize_csv_cell(value), f"'{value}")

    def test_leaves_normal_values_and_numbers_unchanged(self):
        self.assertEqual(sanitize_csv_cell("张鑫"), "张鑫")
        self.assertEqual(sanitize_csv_cell(42), 42)
        self.assertIsNone(sanitize_csv_cell(None))


class EventRetentionTests(unittest.TestCase):
    def test_keeps_only_the_newest_events(self):
        connection = sqlite3.connect(":memory:")
        connection.execute("CREATE TABLE learning_events (id INTEGER PRIMARY KEY)")
        connection.executemany(
            "INSERT INTO learning_events (id) VALUES (?)",
            [(event_id,) for event_id in range(1, 7)],
        )

        prune_event_history(connection, max_events=3)

        remaining_ids = [
            row[0]
            for row in connection.execute(
                "SELECT id FROM learning_events ORDER BY id"
            )
        ]
        self.assertEqual(remaining_ids, [4, 5, 6])


if __name__ == "__main__":
    unittest.main()
