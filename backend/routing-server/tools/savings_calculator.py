from typing import Any

from storage import get_connection


def calculate_savings_rate(month: str) -> dict[str, Any]:
    """Calculate savings and savings percentage from imported or manual data."""
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                COALESCE(SUM(amount), 0) AS total,
                COALESCE(SUM(CASE WHEN category = 'savings' THEN amount ELSE 0 END), 0) AS saved
            FROM expenses
            WHERE date LIKE ?
            """,
            (f"{month}-%",),
        ).fetchone()
    total = row["total"]
    saved = row["saved"]
    return {
        "month": month,
        "total": total,
        "saved": saved,
        "savingsRate": round((saved / total) * 100, 2) if total else 0,
    }


def calculate_goal_progress() -> dict[str, Any] | None:
    """Return progress for the active savings goal, if one exists."""
    with get_connection() as connection:
        goal = connection.execute(
            "SELECT title, target, current, deadline FROM savings_goals WHERE id = 1"
        ).fetchone()
    if goal is None:
        return None
    return {
        "title": goal["title"],
        "target": goal["target"],
        "current": goal["current"],
        "deadline": goal["deadline"],
        "progressPercentage": round((goal["current"] / goal["target"]) * 100, 2),
    }
