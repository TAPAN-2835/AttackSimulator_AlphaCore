import json
import logging
from .base import BaseAIProvider
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class GeminiProvider(BaseAIProvider):
    def __init__(self, model_name: str = "gemini-1.5-pro"):
        self.model_name = model_name
        self.api_key = getattr(settings, "GEMINI_API_KEY", None)
        
        if not self.api_key:
            logger.warning("GEMINI_API_KEY missing from environment. Gemini API calls will fail.")
            
        try:
            import google.generativeai as genai
            if self.api_key:
                genai.configure(api_key=self.api_key)
            self.genai = genai
        except ImportError:
            self.genai = None
            logger.warning("google-generativeai package is not installed. Run `pip install google-generativeai`")

    async def generate_phishing_email(self, attack_type: str, theme: str, difficulty: str, department: str, tone: str) -> dict:
        if not self.genai:
            raise ValueError("google-generativeai library not installed or API key missing.")
            
        prompt = f"""
You are an expert cybersecurity awareness trainer.
Generate a realistic phishing simulation email for a corporate environment with these constraints:
Target Department: {department}
Theme: {theme}
Tone: {tone}
Difficulty: {difficulty}
Attack Type Scenario: {attack_type}

Respond ONLY with a valid JSON object containing exactly three string keys: 'subject', 'body', and 'cta_text'.
Do not wrap inside markdown blocks. 
For the employee name in the greeting, always use the literal string placeholder `{{employee_name}}`.
For the link/button text in the body, wrap the exact 'cta_text' in square brackets like `[Click Here]`.
"""

        try:
            model = self.genai.GenerativeModel(self.model_name)
            # Gemini Python SDK doesn't have an async `generate_content` built-in standardly exposed without wrapper, 
            # so we'll run it synchronously or rely on the async version if available.
            # `generate_content_async` exists in modern versions.
            response = await model.generate_content_async(prompt)
            
            content = response.text
            # Sometimes Gemini wraps JSON in markdown despite instructions.
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            data = json.loads(content.strip())
            
            if not all(k in data for k in ("subject", "body", "cta_text")):
                raise ValueError("AI response missing required JSON keys.")
                
            return {
                "subject": data["subject"],
                "body": data["body"],
                "cta_text": data["cta_text"]
            }
        except Exception as e:
            logger.error(f"Gemini Generation Failed: {e}")
            raise ValueError(f"Failed to generate email content: {str(e)}")
