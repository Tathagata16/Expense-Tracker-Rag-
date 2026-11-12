class BudgetAgent:
    plugin_name = "budget"
    function_name = "monthly_budget"

    def can_handle(self, route: str) -> bool:
        return route == self.plugin_name
