# Spendwise

Spendwise is a minimal expense tracker with a React frontend and a FastAPI backend. The current backend slice provides SQLite-backed expense CRUD and category metadata. RAG ingestion, chat, memory, and Semantic Kernel orchestration will be added incrementally.

## Requirements

- Python 3.11+
- Node.js 18+

## Start the backend

From the repository root:

```powershell
cd backend\routing-server
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. SQLite data is created automatically at `backend\routing-server\data\expenses.db`; no database credentials are required for local development.

## Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend loads expenses from the backend and uses the API for add, edit, and delete operations. Set `VITE_API_URL` if the API is hosted somewhere other than `http://localhost:8000/api`.

## Current API

- `GET /api/categories`
- `GET /api/expenses?month=YYYY-MM`
- `POST /api/expenses`
- `PUT /api/expenses/{id}`
- `DELETE /api/expenses/{id}`

Expense payloads use `title`, `amount`, `category`, `date` (`YYYY-MM-DD`), and optional `note`.

## Planned increments

1. Add monthly summaries and savings-goal persistence.
2. Add PDF/Excel ingestion and document retrieval.
3. Add chat routing, guardrails, memory, and Semantic Kernel plugins.
