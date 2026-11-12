class SavingsAgent:
    plugin_name = "savings"
    rate_function_name = "savings_rate"
    goal_function_name = "goal_progress"

    def can_handle(self, route: str) -> bool:
        return route == self.plugin_name

    def requests_goal_progress(self, query: str) -> bool:
        return any(term in query.lower() for term in ("goal", "target", "progress"))
