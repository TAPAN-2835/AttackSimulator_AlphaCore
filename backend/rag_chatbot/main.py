"""
RAG Chatbot API. Exposes POST /ask for the frontend.
Answers from DB (campaigns, reports, analytics) when relevant; else generic security tips.
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq

from database import get_db
from config import get_settings
from rag_chatbot.db_summary import answer_from_db

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


class ChatAskRequest(BaseModel):
    session_id: str
    role: str
    user_id: str
    query: str


class ChatAskResponse(BaseModel):
    response: str


def _fallback_response(query: str) -> str:
    """Fallback when RAG/LLM deps are not installed or key is missing."""
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


async def get_ai_response(query: str, context: str | None = None) -> str | None:
    """Call Groq LLM with context for a smart answer."""
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set; using fallback logic.")
        return None

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        system_prompt = (
            "You are 'Breach Assistant', a friendly security awareness expert. "
            "Your goal is to help users understand phishing, social engineering, and security best practices. "
            "If context about the user's simulation campaigns or analytics is provided, use it to answer precisely. "
            "Otherwise, provide general, helpful security advice. Keep answers concise."
        )
        
        user_prompt = query
        if context:
            user_prompt = f"System Context (Current Database Data):\n{context}\n\nUser Question: {query}"

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            max_tokens=512,
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error("Groq AI call failed: %s", e)
        return None


@router.post("/ask", response_model=ChatAskResponse)
async def ask(
    body: ChatAskRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatAskResponse:
    """Handle a chat message. Answers from DB when query is about campaigns/reports/analytics, else security tips."""
    # 1. Try to get real-time context from DB
    context = await answer_from_db(db, body.query)
    
    # 2. Try to get a smart answer from AI
    response = await get_ai_response(body.query, context)
    
    # 3. Fallback if AI fails or key is missing
    if response is None:
        response = context if context else _fallback_response(body.query)
        
    return ChatAskResponse(response=response)
