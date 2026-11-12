from datetime import date, datetime
from io import BytesIO
from typing import Any

from fastapi import HTTPException, UploadFile
from openpyxl import load_workbook

from agents.categoriser.agent import CategoriserAgent
from rag.ingestion import build_chunks, embed_chunks
from storage import get_connection


EXPECTED_COLUMNS = {"title", "amount", "category", "date", "note"}
CATEGORISER = CategoriserAgent()


def _normalise_text(value: Any) -> str:
    return " ".join(str(value).strip().lower().split())


def _normalise_headers(values: tuple[Any, ...]) -> list[str]:
    headers = [_normalise_text(value) for value in values]
    if any(not header for header in headers):
        raise ValueError("Column names cannot be empty")
    if len(set(headers)) != len(headers):
        raise ValueError("Column names must be unique")
    if set(headers) != EXPECTED_COLUMNS:
        missing = sorted(EXPECTED_COLUMNS - set(headers))
        extra = sorted(set(headers) - EXPECTED_COLUMNS)
        details = []
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        if extra:
            details.append(f"unexpected: {', '.join(extra)}")
        raise ValueError(f"Invalid columns ({'; '.join(details)})")
    return headers


def _parse_date(value: Any, row_number: int) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip()).isoformat()
        except ValueError:
            pass
    raise ValueError(f"Row {row_number}: date must be YYYY-MM-DD")


def _parse_rows(workbook: Any) -> list[tuple[str, float, str, str, str]]:
    sheets = workbook.worksheets
    if len(sheets) != 1:
        raise ValueError("The workbook must contain exactly one worksheet")
    worksheet = sheets[0]
    if worksheet.max_row < 2:
        raise ValueError("The worksheet must contain at least one data row")

    headers = _normalise_headers(tuple(cell.value for cell in worksheet[1]))
    indexes = {header: index for index, header in enumerate(headers)}
    rows = []
    for row_number, values in enumerate(
        worksheet.iter_rows(min_row=2, values_only=True), start=2
    ):
        if all(value is None or (isinstance(value, str) and not value.strip()) for value in values):
            raise ValueError(f"Row {row_number}: blank rows are not allowed")
        title = str(values[indexes["title"]]).strip() if values[indexes["title"]] is not None else ""
        if not title:
            raise ValueError(f"Row {row_number}: title is required")
        try:
            amount = float(values[indexes["amount"]])
        except (TypeError, ValueError) as error:
            raise ValueError(f"Row {row_number}: amount must be a positive number") from error
        if amount <= 0:
            raise ValueError(f"Row {row_number}: amount must be a positive number")

        category = CATEGORISER.categorise(values[indexes["category"]])
        if category is None:
            raise ValueError(f"Row {row_number}: category is not supported")
        parsed_date = _parse_date(values[indexes["date"]], row_number)
        note_value = values[indexes["note"]]
        note = str(note_value).strip() if note_value is not None else ""
        rows.append((title, amount, category, parsed_date, note))

    if not rows:
        raise ValueError("The worksheet must contain at least one data row")
    return rows


async def ingest_xlsx(file: UploadFile) -> dict[str, Any]:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="Only .xlsx files are accepted")
    workbook = None
    try:
        workbook = load_workbook(BytesIO(await file.read()), read_only=True, data_only=True)
        rows = _parse_rows(workbook)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Invalid XLSX file: {error}") from error
    finally:
        if workbook is not None:
            workbook.close()

    chunks = build_chunks(filename, rows)
    try:
        embedded_chunks = await embed_chunks(chunks)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    with get_connection() as connection:
        connection.executemany(
            "INSERT INTO expenses (title, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
            rows,
        )
        document_text = "\n".join(
            f"{title} | {amount} | {category} | {parsed_date} | {note}"
            for title, amount, category, parsed_date, note in rows
        )
        connection.execute(
            "INSERT INTO documents (filename, content) VALUES (?, ?)",
            (filename, document_text),
        )
        document_id = connection.execute("SELECT last_insert_rowid()").fetchone()[0]
        connection.executemany(
            """
            INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
            VALUES (?, ?, ?, ?)
            """,
            [
                (document_id, chunk["chunk_index"], chunk["content"], chunk["embedding"])
                for chunk in embedded_chunks
            ],
        )
    return {"success": True, "transactionCount": len(rows), "total": sum(row[1] for row in rows)}
