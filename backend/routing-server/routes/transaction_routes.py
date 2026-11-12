from datetime import date

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field

from category_catalog import CATEGORIES
from services.xlsx_ingestion import ingest_xlsx
from storage import get_connection, row_to_dict


router = APIRouter(tags=["expenses"])

CATEGORY_IDS = {category["id"] for category in CATEGORIES}


class ExpenseInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    category: str
    date: date
    note: str = Field(default="", max_length=500)


class SavingsGoalInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    target: float = Field(gt=0)
    current: float = Field(ge=0)
    deadline: date


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


@router.post("/upload")
async def upload_xlsx(file: UploadFile = File(...)):
    return await ingest_xlsx(file)


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


@router.get("/summary")
def get_summary(year: int = Query(ge=2000, le=2100)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                substr(date, 1, 7) AS month,
                SUM(amount) AS total,
                SUM(CASE WHEN category = 'savings' THEN amount ELSE 0 END) AS saved
            FROM expenses
            WHERE date LIKE ?
            GROUP BY substr(date, 1, 7)
            ORDER BY month
            """,
            (f"{year}-%",),
        ).fetchall()
        categories = connection.execute(
            """
            SELECT substr(date, 1, 7) AS month, category, SUM(amount) AS total
            FROM expenses
            WHERE date LIKE ?
            GROUP BY substr(date, 1, 7), category
            ORDER BY month, total DESC
            """,
            (f"{year}-%",),
        ).fetchall()

    top_categories: dict[str, str] = {}
    for row in categories:
        top_categories.setdefault(row["month"], row["category"])
    return [
        {
            "month": row["month"],
            "total": row["total"],
            "saved": row["saved"],
            "topCategory": top_categories.get(row["month"]),
        }
        for row in rows
    ]


@router.get("/goals/active")
def get_active_goal():
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, title, target, current, deadline FROM savings_goals WHERE id = 1"
        ).fetchone()
    return row_to_dict(row) if row else None


@router.put("/goals/active")
def save_active_goal(goal: SavingsGoalInput):
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO savings_goals (id, title, target, current, deadline)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                target = excluded.target,
                current = excluded.current,
                deadline = excluded.deadline
            """,
            (goal.title.strip(), goal.target, goal.current, goal.deadline.isoformat()),
        )
        row = connection.execute(
            "SELECT id, title, target, current, deadline FROM savings_goals WHERE id = 1"
        ).fetchone()
    return row_to_dict(row)

