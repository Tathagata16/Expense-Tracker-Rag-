import json
import math
from rag.embeddings import create_embeddings
from storage import get_connection


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0
    return numerator / (left_norm * right_norm)


async def retrieve_relevant_chunks(query: str, limit: int = 5) -> list[str]:
    [query_embedding] = await create_embeddings([query])
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT content, embedding FROM document_chunks"
        ).fetchall()
    ranked = sorted(
        (
            (
                _cosine_similarity(query_embedding, json.loads(row["embedding"])),
                row["content"],
            )
            for row in rows
        ),
        key=lambda item: item[0],
        reverse=True,
    )
    return [content for score, content in ranked[:limit] if score > 0]
