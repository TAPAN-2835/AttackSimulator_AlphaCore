import json
import logging
from .base import BaseAIProvider
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class ClaudeProvider(BaseAIProvider):
    def __init__(self, model_name: str = "claude-3-5-sonnet-20240620"):
        self.model_name = model_name
        self.api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
        
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY missing from environment. Claude API calls will fail.")
            
        try:
            from anthropic import AsyncAnthropic
            self.client = AsyncAnthropic(api_key=self.api_key)
        except ImportError:
            self.client = None
            logger.warning("anthropic package is not installed. Run `pip install anthropic`")

    async def generate_phishing_email(self, attack_type: str, theme: str, difficulty: str, department: str, tone: str) -> dict:
        if not self.client:
            raise ValueError("Anthropic library not installed or API key missing.")
            
        system_prompt = (
            "You are an expert cybersecurity awareness trainer. "
            "Your task is to generate realistic phishing simulation emails for a corporate environment to test employees. "
            "Respond ONLY with a valid JSON object containing exactly three string keys: 'subject', 'body', and 'cta_text'. "
            "Do not wrap inside markdown blocks. "
            "For the employee name in the greeting, always use the literal string placeholder `{employee_name}`. "
            "For the link/button text in the body, wrap the exact 'cta_text' in square brackets like `[Click Here]`."
        )

        user_prompt = f"""
Generate a phishing simulation email with the following constraints:
Target Department: {department}
Theme: {theme}
Tone: {tone}
Difficulty: {difficulty}
Attack Type Scenario: {attack_type}
"""

        try:
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=600,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            content = response.content[0].text
            if not content:
                raise Exception("Empty response from AI.")
                
            data = json.loads(content)
            if not all(k in data for k in ("subject", "body", "cta_text")):
                raise ValueError("AI response missing required JSON keys.")
                
            return {
                "subject": data["subject"],
                "body": data["body"],
                "cta_text": data["cta_text"]
            }
        except Exception as e:
            logger.error(f"Claude Generation Failed: {e}")
            raise ValueError(f"Failed to generate email content: {str(e)}")
