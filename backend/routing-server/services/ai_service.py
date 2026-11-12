import os
import re
from typing import Any

import httpx

from agents.guardrail.agent import GuardrailAgent
from memory.memory_service import append_message, load_messages
from orchestration.coach_manager import CoachManager
from orchestration.kernel import create_kernel
from rag.retriever import retrieve_relevant_chunks
from storage import get_connection


GUARDRAIL_AGENT = GuardrailAgent()


def _tokens(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2]


def retrieve_context(query: str, month: str | None) -> str:
    tokens = _tokens(query)
    with get_connection() as connection:
        if tokens:
            filters = " OR ".join(
                ["lower(title) LIKE ? OR lower(category) LIKE ? OR lower(note) LIKE ?"] * len(tokens)
            )
            parameters: list[Any] = []
            for token in tokens:
                pattern = f"%{token}%"
                parameters.extend([pattern, pattern, pattern])
            rows = connection.execute(
                f"""
                SELECT title, amount, category, date, note
                FROM expenses
                WHERE ({filters}) {"AND date LIKE ?" if month else ""}
                ORDER BY date DESC
                LIMIT 50
                """,
                (*parameters, f"{month}-%") if month else tuple(parameters),
            ).fetchall()
        else:
            rows = []
        if not rows:
            rows = connection.execute(
                """
                SELECT title, amount, category, date, note
                FROM expenses
                WHERE date LIKE ?
                ORDER BY date DESC
                LIMIT 100
                """,
                (f"{month}-%",) if month else ("%",),
            ).fetchall()
    expense_context = "\n".join(
        f"Expense: {row['title']} | amount={row['amount']} | category={row['category']} | "
        f"date={row['date']} | note={row['note']}"
        for row in rows
    )
    return expense_context or "No matching manually entered expense records were found."


async def answer_query(
    messages: list[dict[str, str]], month: str | None, session_id: str
) -> str:
    user_message = next(
        (message["content"] for message in reversed(messages) if message["role"] == "user"),
        "",
    )
    GUARDRAIL_AGENT.validate_query(user_message)
    conversation = load_messages(session_id)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    try:
        document_chunks = await retrieve_relevant_chunks(user_message)
    except RuntimeError as error:
        raise RuntimeError(f"RAG retrieval failed: {error}") from error
    manual_context = retrieve_context(user_message, month)
    try:
        routing = await CoachManager(create_kernel()).route_and_run(user_message, month)
    except RuntimeError as error:
        raise RuntimeError(f"Semantic Kernel orchestration failed: {error}") from error
    plugin_context = routing["plugin_context"]
    context = "\n\n".join(
        [
            f"Query agent route: {routing['route']}",
            f"Plugin calculation: {plugin_context}" if plugin_context else "",
            manual_context,
            *document_chunks,
        ]
    )
    system_prompt = f"""
You are Spendwise, an expense analysis assistant.
Answer only from the provided expense context. If the context does not contain enough
information, say so plainly. Do not invent transactions, totals, dates, or goals.
Do not provide investment advice or instructions about what the user should do with money.
You may calculate using the provided records, but explain the records used.

Expense context:
{context}
""".strip()
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            *conversation,
            {"role": "user", "content": user_message},
        ],
        "temperature": 0,
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as error:
        detail = error.response.text[:500]
        raise RuntimeError(f"LLM provider rejected the request: {detail}") from error
    except httpx.RequestError as error:
        raise RuntimeError(f"LLM provider is unavailable: {error}") from error

    body = response.json()
    try:
        answer = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise RuntimeError("LLM provider returned an invalid response") from error
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("LLM provider returned an empty response")
    guarded_answer = GUARDRAIL_AGENT.validate_response(answer)
    append_message(session_id, "user", user_message)
    append_message(session_id, "assistant", guarded_answer)
    return guarded_answer
