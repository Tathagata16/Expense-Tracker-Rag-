import sqlite3
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from storage import get_connection, row_to_dict


router = APIRouter(tags=["expenses"])

CATEGORIES = [
    {"id": "food", "label": "Food & Dining", "color": "#C8A97E", "icon": "🍽️"},
    {"id": "transport", "label": "Transport", "color": "#8FA8C8", "icon": "🚗"},
    {"id": "utilities", "label": "Utilities", "color": "#A8C4A2", "icon": "⚡"},
    {"id": "entertainment", "label": "Entertainment", "color": "#C4A8C0", "icon": "🎬"},
    {"id": "health", "label": "Health", "color": "#C4B8A0", "icon": "💊"},
    {"id": "shopping", "label": "Shopping", "color": "#C0A898", "icon": "🛍️"},
    {"id": "rent", "label": "Rent & Housing", "color": "#A0B4C8", "icon": "🏠"},
    {"id": "savings", "label": "Savings", "color": "#A8C4A8", "icon": "💰"},
]
CATEGORY_IDS = {category["id"] for category in CATEGORIES}


class ExpenseInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    category: str
    date: date
    note: str = Field(default="", max_length=500)


def validate_category(category: str) -> None:
    if category not in CATEGORY_IDS:
        raise HTTPException(status_code=422, detail="Unknown expense category")


def validate_month(month: str | None) -> None:
    if month is None:
        return
    try:
        date.fromisoformat(f"{month}-01")
    except ValueError as error:
        raise HTTPException(status_code=422, detail="month must use YYYY-MM format") from error


@router.get("/categories")
def list_categories():
    return CATEGORIES


@router.get("/expenses")
def list_expenses(month: str | None = Query(default=None)):
    validate_month(month)
    query = "SELECT id, title, amount, category, date, note FROM expenses"
    parameters: tuple[str, ...] = ()
    if month:
        query += " WHERE date LIKE ?"
        parameters = (f"{month}-%",)
    query += " ORDER BY date DESC, id DESC"

    with get_connection() as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [row_to_dict(row) for row in rows]


@router.post("/expenses", status_code=status.HTTP_201_CREATED)
def create_expense(expense: ExpenseInput):
    validate_category(expense.category)
    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO expenses (title, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
            (expense.title.strip(), expense.amount, expense.category, expense.date.isoformat(), expense.note.strip()),
        )
        row = connection.execute(
            "SELECT id, title, amount, category, date, note FROM expenses WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return row_to_dict(row)


@router.put("/expenses/{expense_id}")
def update_expense(expense_id: int, expense: ExpenseInput):
    validate_category(expense.category)
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE expenses
            SET title = ?, amount = ?, category = ?, date = ?, note = ?
            WHERE id = ?
            """,
            (expense.title.strip(), expense.amount, expense.category, expense.date.isoformat(), expense.note.strip(), expense_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        row = connection.execute(
            "SELECT id, title, amount, category, date, note FROM expenses WHERE id = ?",
            (expense_id,),
        ).fetchone()
    return row_to_dict(row)


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int):
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Expense not found")

