from agents.editing.agent import EditingAgent


class QueryAgent:
    """Routes a user question to the most relevant specialist."""

    def __init__(self) -> None:
        self.editing_agent = EditingAgent()

    def route(self, query: str) -> str:
        lowered = query.lower()
        if self.editing_agent.is_edit_request(query):
            return "editing"
        if any(term in lowered for term in ("saving", "saved", "goal", "save")):
            return "savings"
        if any(
            term in lowered
            for term in ("spend", "spent", "budget", "category", "expense", "total", "cost")
        ):
            return "budget"
        return "general"
