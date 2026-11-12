import sqlite3
from pathlib import Path
from typing import Any


DATABASE_PATH = Path(__file__).resolve().parent / "data" / "expenses.db"


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL CHECK (amount > 0),
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT ''
            )
            """
        )


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)
