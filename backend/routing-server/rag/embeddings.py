import os
from typing import Any

import httpx


def _embedding_config() -> tuple[str, str, str]:
    api_key = os.getenv("EMBEDDING_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "EMBEDDING_API_KEY or OPENAI_API_KEY is not configured; "
            "XLSX embeddings cannot be generated"
        )
    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    base_url = os.getenv("EMBEDDING_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    return api_key, model, base_url


async def create_embeddings(texts: list[str]) -> list[list[float]]:
    api_key, model, base_url = _embedding_config()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{base_url}/embeddings",
                json={"model": model, "input": texts},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as error:
        detail = error.response.text[:500]
        raise RuntimeError(f"Embedding provider rejected the request: {detail}") from error
    except httpx.RequestError as error:
        raise RuntimeError(f"Embedding provider is unavailable: {error}") from error

    body: dict[str, Any] = response.json()
    data = body.get("data")
    if not isinstance(data, list) or len(data) != len(texts):
        raise RuntimeError("Embedding provider returned an invalid response")
    ordered = sorted(data, key=lambda item: item.get("index", 0))
    embeddings = [item.get("embedding") for item in ordered]
    if any(not isinstance(embedding, list) or not embedding for embedding in embeddings):
        raise RuntimeError("Embedding provider returned an invalid vector")
    return embeddings
