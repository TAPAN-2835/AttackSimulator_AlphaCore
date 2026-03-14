import logging
from fastapi import APIRouter, HTTPException, Depends
from schemas.request_models import AIEmailGenerateRequest, AIEmailGenerateResponse
from ai_providers.factory import get_ai_provider

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate-phishing-email", response_model=AIEmailGenerateResponse)
async def generate_phishing_email(req: AIEmailGenerateRequest):
    """
    Generates a realistic phishing email using the requested LLM.
    Returns JSON containing subject, body, and cta_text.
    """
    try:
        provider = get_ai_provider(req.model)
        
        result_json = await provider.generate_phishing_email(
            attack_type=req.attack_type,
            theme=req.theme,
            difficulty=req.difficulty,
            department=req.department,
            tone=req.tone
        )
        
        return AIEmailGenerateResponse(
            subject=result_json.get("subject", "Action Required"),
            body=result_json.get("body", "Please review the attached document."),
            cta_text=result_json.get("cta_text", "Review Document")
        )
        
    except ValueError as ve:
        logger.warning(f"AI Generation validation error: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI email content. Check API keys and model status.")
