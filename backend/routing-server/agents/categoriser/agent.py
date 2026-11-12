from typing import Any

from category_catalog import CATEGORIES


class CategoriserAgent:
    def __init__(self) -> None:
        self._aliases = {
            " ".join(category["label"].lower().split()): category["id"]
            for category in CATEGORIES
        }

    def categorise(self, value: Any) -> str | None:
        normalised = " ".join(str(value).strip().lower().split())
        return self._aliases.get(normalised)
