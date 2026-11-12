import json
from typing import Annotated

from semantic_kernel.functions import KernelArguments, kernel_function

from tools.budget_calculator import calculate_monthly_budget
from tools.savings_calculator import calculate_goal_progress, calculate_savings_rate


class BudgetPlugin:
    @kernel_function(
        name="monthly_budget",
        description="Calculate spending totals grouped by category for a YYYY-MM month.",
    )
    def monthly_budget(self, month: Annotated[str, "Month in YYYY-MM format"]) -> str:
        return json.dumps(calculate_monthly_budget(month))


class SavingsPlugin:
    @kernel_function(
        name="savings_rate",
        description="Calculate the savings amount and percentage for a YYYY-MM month.",
    )
    def savings_rate(self, month: Annotated[str, "Month in YYYY-MM format"]) -> str:
        return json.dumps(calculate_savings_rate(month))

    @kernel_function(
        name="goal_progress",
        description="Return the active savings goal progress.",
    )
    def goal_progress(self) -> str:
        return json.dumps(calculate_goal_progress())


class QueryAgent:
    """Small deterministic query router used before the LLM is called."""

    def route(self, query: str) -> str:
        lowered = query.lower()
        if any(term in lowered for term in ("saving", "saved", "goal", "save")):
            return "savings"
        if any(
            term in lowered
            for term in ("spend", "spent", "budget", "category", "expense", "total", "cost")
        ):
            return "budget"
        return "general"


class CoachManager:
    def __init__(self, kernel):
        self.kernel = kernel
        self.query_agent = QueryAgent()

    async def route_and_run(self, query: str, month: str | None) -> dict[str, str]:
        route = self.query_agent.route(query)
        if route == "general":
            return {"route": route, "plugin_context": ""}
        arguments = KernelArguments(month=month)
        if route == "savings" and any(term in query.lower() for term in ("goal", "target", "progress")):
            function = self.kernel.get_function("savings", "goal_progress")
            arguments = KernelArguments()
        elif route == "budget":
            if month is None:
                return {"route": route, "plugin_context": ""}
            function = self.kernel.get_function("budget", "monthly_budget")
        else:
            if month is None:
                return {"route": route, "plugin_context": ""}
            function = self.kernel.get_function("savings", "savings_rate")
        result = await self.kernel.invoke(function, arguments=arguments)
        return {"route": route, "plugin_context": str(result.value)}
