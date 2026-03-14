"""
RAG Chatbot API. Exposes POST /ask for the frontend.
Answers from DB (campaigns, reports, analytics) when relevant; else generic security tips.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from rag_chatbot.db_summary import answer_from_db

router = APIRouter()


class ChatAskRequest(BaseModel):
    session_id: str
    role: str
    user_id: str
    query: str


class ChatAskResponse(BaseModel):
    response: str


def _fallback_response(query: str) -> str:
    """Fallback when RAG/LLM deps are not installed."""
    q = (query or "").strip().lower()
    if not q:
        return "Ask me anything about phishing, security awareness, or how to spot suspicious emails."
    if "phish" in q or "suspicious" in q or "email" in q:
        return (
            "Phishing emails often use urgent language, mismatched sender domains, or fake login pages. "
            "Always check the sender address and hover over links before clicking. "
            "When in doubt, report the email to IT and do not enter credentials."
        )
    if "link" in q or "click" in q:
        return (
            "Before clicking links: hover to see the real URL, check for typos (e.g. goggle.com), "
            "and prefer going to the site directly from your browser or bookmarks."
        )
    if "password" in q or "credential" in q or "login" in q:
        return (
            "Never enter passwords or credentials from an email link. Legitimate services will not ask "
            "you to re-enter your password via email. Use the official app or type the URL yourself."
        )
    if "report" in q:
        return (
            "Use your email client's 'Report phishing' or 'Report suspicious' option, or forward the email "
            "to your IT security team. Reporting helps protect the whole organization."
        )
    return (
        "For security awareness: watch for urgency, sender mismatches, and requests for credentials or clicks. "
        "You can ask me specifically about phishing, suspicious links, passwords, or reporting."
    )


@router.post("/ask", response_model=ChatAskResponse)
async def ask(
    body: ChatAskRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatAskResponse:
    """Handle a chat message. Answers from DB when query is about campaigns/reports/analytics, else security tips."""
    response = await answer_from_db(db, body.query)
    if response is None:
        response = _fallback_response(body.query)
    return ChatAskResponse(response=response)
