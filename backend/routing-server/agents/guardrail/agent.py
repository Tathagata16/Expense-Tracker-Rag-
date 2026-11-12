import re


REFUSAL = (
    "I can help explain your recorded expenses and savings data, but I cannot provide "
    "direct investment advice or tell you what to do with your money."
)
BLOCKED_QUERY_TERMS = (
    "invest in",
    "which stock",
    "which crypto",
    "buy shares",
    "sell shares",
    "investment advice",
    "what should i do with my money",
    "where should i put my money",
)
UNSAFE_RESPONSE_PATTERNS = (
    r"\byou should invest\b",
    r"\bbuy shares of\b",
    r"\bsell shares of\b",
    r"\bput your money in\b",
    r"\binvest your money in\b",
)


class GuardrailAgent:
    def validate_query(self, query: str) -> None:
        if any(term in query.lower() for term in BLOCKED_QUERY_TERMS):
            raise ValueError(REFUSAL)

    def validate_response(self, response: str) -> str:
        if any(re.search(pattern, response, flags=re.IGNORECASE) for pattern in UNSAFE_RESPONSE_PATTERNS):
            return REFUSAL
        return response
