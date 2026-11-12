from typing import Any

from storage import get_connection


def calculate_category_spend(month: str, category: str) -> dict[str, Any]:
    """Return the transaction count and total for one category and month."""
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS transaction_count, COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE date LIKE ? AND category = ?
            """,
            (f"{month}-%", category),
        ).fetchone()
    return {
        "month": month,
        "category": category,
        "transactionCount": row["transaction_count"],
        "total": row["total"],
    }


def calculate_monthly_budget(month: str) -> dict[str, Any]:
    """Return totals grouped by category for a month."""
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT category, COUNT(*) AS transaction_count, SUM(amount) AS total
            FROM expenses
            WHERE date LIKE ?
            GROUP BY category
            ORDER BY total DESC
            """,
            (f"{month}-%",),
        ).fetchall()
    categories = [
        {
            "category": row["category"],
            "transactionCount": row["transaction_count"],
            "total": row["total"],
        }
        for row in rows
    ]
    return {
        "month": month,
        "total": sum(category["total"] for category in categories),
        "categories": categories,
    }
