from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.ai_service import REFUSAL, answer_query


router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)
    context: str | None = None


@router.post("")
async def chat(request: ChatRequest):
    messages = [message.model_dump() for message in request.messages]
    try:
        reply = await answer_query(messages, request.context)
    except ValueError as error:
        if str(error) == REFUSAL:
            return {"reply": REFUSAL}
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"reply": reply}
