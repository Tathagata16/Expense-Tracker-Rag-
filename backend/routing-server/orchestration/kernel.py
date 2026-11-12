import os

from openai import AsyncOpenAI
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion

from orchestration.coach_manager import BudgetPlugin, SavingsPlugin


def create_kernel() -> Kernel:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    kernel = Kernel()
    kernel.add_service(
        OpenAIChatCompletion(
            service_id="groq",
            ai_model_id=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            async_client=AsyncOpenAI(
                api_key=api_key,
                base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
            ),
        )
    )
    kernel.add_plugin(BudgetPlugin(), plugin_name="budget")
    kernel.add_plugin(SavingsPlugin(), plugin_name="savings")
    return kernel
