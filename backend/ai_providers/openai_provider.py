import json
import logging
import os
from openai import AsyncOpenAI
from .base import BaseAIProvider
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class OpenAIProvider(BaseAIProvider):
    def __init__(self, model_name: str = "llama3-8b-8192"):
        self.model_name = model_name
        self.api_key = getattr(settings, "OPENAI_API_KEY", "")
        
        if not self.api_key:
            logger.warning("OPENAI_API_KEY missing from environment. OpenAI Generation will fail.")
            
        self.client = AsyncOpenAI(
            api_key=self.api_key
        )

    async def generate_phishing_email(
        self,
        attack_type: str,
        theme: str,
        difficulty: str,
        department: str,
        tone: str
    ) -> dict:
        
        system_prompt = (
            "You are an expert cybersecurity awareness trainer. "
            "Your task is to generate realistic phishing simulation emails for a corporate environment to test employees. "
            "The email must look realistic but be safe for cybersecurity training. "
            "Respond ONLY with a valid JSON object containing exactly three string keys: "
            "'subject', 'body', and 'cta_text'. "
            "Do not wrap inside markdown blocks. "
            "For the employee name in the greeting, always use the literal string placeholder `{employee_name}`. "
            "For the link/button text in the body, wrap the exact 'cta_text' in square brackets like `[Click Here]` "
            "so the system can replace it with a tracked tracking link."
        )

        user_prompt = f"""
Generate a phishing simulation email with the following constraints:
Target Department: {department}
Theme: {theme}
Tone: {tone}
Difficulty: {difficulty}
Attack Type Scenario: {attack_type}

Return exactly this JSON format:
{{
  "subject": "Email Subject Line",
  "body": "Dear {{employee_name}},\\n\\nBody text... Please review the attached.\\n\\n[Action Button Text]\\n\\nSignoff",
  "cta_text": "Action Button Text"
}}
"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=600
            )
            
            content = response.choices[0].message.content
            if not content:
                raise Exception("Empty compliance response from AI.")
                
            data = json.loads(content)
            
            # Basic validation
            if not all(k in data for k in ("subject", "body", "cta_text")):
                raise ValueError("AI response missing required JSON keys.")
                
            return {
                "subject": data["subject"],
                "body": data["body"],
                "cta_text": data["cta_text"]
            }
            
        except Exception as e:
            logger.error(f"AI Generation Failed: {e}")
            raise ValueError(f"Failed to generate email content: {str(e)}")
