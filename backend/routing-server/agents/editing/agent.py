class EditingAgent:
    """Identifies edit requests; CRUD endpoints perform the actual mutation."""

    def is_edit_request(self, query: str) -> bool:
        return any(
            term in query.lower()
            for term in ("edit", "change", "update", "correct", "delete", "remove")
        )
