from typing import TypedDict

from storage import get_connection, initialise_database


class MemoryMessage(TypedDict):
    role: str
    content: str


def load_messages(session_id: str, limit: int = 20) -> list[MemoryMessage]:
    initialise_database()
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT role, content
            FROM conversation_messages
            WHERE session_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (session_id, limit),
        ).fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in reversed(rows)]


def append_message(session_id: str, role: str, content: str) -> None:
    initialise_database()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO conversation_messages (session_id, role, content)
            VALUES (?, ?, ?)
            """,
            (session_id, role, content),
        )
