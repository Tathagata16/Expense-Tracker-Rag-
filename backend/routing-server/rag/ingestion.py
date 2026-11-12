import json
from typing import Any

from rag.embeddings import create_embeddings


def build_chunks(
    filename: str, rows: list[tuple[str, float, str, str, str]]
) -> list[dict[str, Any]]:
    return [
        {
            "chunk_index": index,
            "content": (
                f"Source file: {filename}. Expense title: {title}. Amount: {amount}. "
                f"Category: {category}. Date: {parsed_date}. Note: {note or 'None'}."
            ),
        }
        for index, (title, amount, category, parsed_date, note) in enumerate(rows)
    ]


async def embed_chunks(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    embeddings = await create_embeddings([chunk["content"] for chunk in chunks])
    return [
        {**chunk, "embedding": json.dumps(embedding, separators=(",", ":"))}
        for chunk, embedding in zip(chunks, embeddings)
    ]
