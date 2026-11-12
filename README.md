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

For chat, configure the LLM provider before starting the backend:

```powershell
$env:GROQ_API_KEY = "gsk_your-key"
$env:GROQ_MODEL = "openai/gpt-oss-120b"
$env:EMBEDDING_API_KEY = "your-embedding-provider-key"
$env:EMBEDDING_MODEL = "text-embedding-3-small"
```

`GROQ_BASE_URL` is optional and defaults to `https://api.groq.com/openai/v1`. Groq is used for chat generation. Groq does not currently provide an embeddings endpoint, so `EMBEDDING_API_KEY` must belong to a separate OpenAI-compatible embeddings provider. Set `EMBEDDING_BASE_URL` if needed.

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
- `GET /api/summary?year=YYYY`
- `GET /api/goals/active`
- `PUT /api/goals/active`
- `POST /api/chat`

Expense payloads use `title`, `amount`, `category`, `date` (`YYYY-MM-DD`), and optional `note`.

## Semantic Kernel orchestration

The chat path creates a Semantic Kernel with the Groq-compatible chat service and registers:

- `budget.monthly_budget`
- `savings.savings_rate`
- `savings.goal_progress`

The query agent routes spending and category questions to the budget plugin, savings and goal questions to the savings plugin, and lets general questions use the grounded RAG context directly.

The specialist agents live under `backend/routing-server/agents/`: query, budget, savings, categoriser, editing, and guardrail. Editing requests are identified by the editing agent and should be completed through the existing expense CRUD endpoints rather than silently mutated by chat.

## XLSX import format

The chat screen accepts `.xlsx` files only. The workbook must contain exactly one worksheet with exactly these columns:

```text
title | amount | category | date | note
```

Use positive numbers for `amount`, `YYYY-MM-DD` for `date`, and one of the supported category names: Food & Dining, Transport, Utilities, Entertainment, Health, Shopping, Rent & Housing, or Savings. Headers and text values are trimmed and compared case-insensitively. Any missing, extra, duplicate, malformed, or unsupported value rejects the entire file before anything is stored.

Imported rows are saved as expenses and split into one searchable chunk per row. Each chunk is embedded with `EMBEDDING_MODEL` and stored in SQLite alongside its vector. PDF import is intentionally not enabled yet.

## Chat behavior

`POST /api/chat` embeds the question, ranks stored chunks with cosine similarity, and sends only the top relevant imported chunks plus matching manual expense records to the configured LLM. Requests for direct investment advice are refused, provider/configuration errors are returned explicitly, and there is no mock response fallback.

Chat turns are persisted in SQLite by `session_id`. The frontend stores a session ID in browser local storage and sends it with each request, so recent conversation context survives page refreshes in the same browser.

## Data tools

The plugin-ready functions in `backend/routing-server/tools/` operate directly on stored expenses:

- `calculate_category_spend` and `calculate_monthly_budget`
- `calculate_savings_rate` and `calculate_goal_progress`

They are plain Python functions so the future Semantic Kernel orchestration layer can register them without changing their calculations.
