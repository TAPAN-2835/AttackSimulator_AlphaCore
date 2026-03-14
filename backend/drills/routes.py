import json
import logging
from fastapi import APIRouter, HTTPException
from ai_providers.factory import get_ai_provider
from schemas.request_models import DrillScenario

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/random", response_model=DrillScenario)
async def get_random_response_drill():
    """
    Generates a completely randomized cybersecurity awareness scenario for end-users.
    Uses the default high-capability LLM to create unique drills.
    """
    try:
        import random
        # Significantly expanded categories for maximum variety
        categories = [
            "Physical Security (Tailgating, Unlocked Workstations)",
            "Social Engineering (Phone calls, Face-to-face manipulation, Pretexting)",
            "Advanced Phishing (Spear phishing, Smishing via WhatsApp/SMS, Vishing)",
            "Removable Media (USB Drops, Unknown Charging Cables in Airports)",
            "Working from Home (Public Wi-Fi, Family/Friends using work laptop)",
            "Cloud Security (MFA bypass, Over-sharing files, Shadow IT)",
            "Incident Reporting (Finding anomalous logs, reporting hardware leaks)",
            "Password Hygiene (Post-it notes, Password sharing, Reuse)",
            "Clean Desk & Clear Screen (Sensitive docs on printer, unlocked screen in cafe)",
            "AI & Deepfakes (Deepfake audio from CEO, AI-generated 'HR' video)",
            "Insider Threat (Coworker asking for unauthorized access)",
            "Travel Security (Laptop theft at airport, unencrypted devices)",
            "Social Media & Oversharing (Posting office badges/internal meetings on LinkedIn)",
            "Software Updates (Postponing critical patches on work machine)",
            "Information Classification (Sending 'Internal Only' docs to personal email)",
            "Destroying Data (Dumping sensitive papers in trash vs shredding)",
            "Mobile Device Security (Lost phone, unverified app installs)",
            "Wi-Fi Security (Evil Twin hotspots, router misconfiguration at home)",
            "Third-Party Risk (Vendor asking for credentials without ticket)",
            "Legal & Compliance (GDPR/PII data handling errors)"
        ]
        chosen_category = random.choice(categories)

        # Randomly choose a difficulty if not specified
        difficulty_options = ["Low", "Medium", "High"]
        chosen_diff = random.choice(difficulty_options)

        # We'll use the default Llama/Groq model for fast, free generations
        provider = get_ai_provider("llama")
        
        if not hasattr(provider, 'client') or not getattr(provider, 'client'):
             raise HTTPException(status_code=500, detail="AI Provider client is not initialized or supported for generic drills.")
             
        system_prompt = (
            "You are an expert cybersecurity awareness trainer. Your goal is to keep employees sharp by creating VIVID, DIVERSE, and UNIQUE scenarios. "
            f"Focus this scenario on: {chosen_category}. Target Difficulty: {chosen_diff}. "
            "Avoid generic office tropes. Think about specific, modern, and sneaky threats. "
            "Return EXACTLY a valid JSON object matching this structure: \n"
            "{\n"
            '  "title": "A catchy, realistic title",\n'
            '  "description": "A detailed 2-3 sentence description of the incident context",\n'
            '  "difficulty": "Low, Medium, or High",\n'
            '  "options": [\n'
            '    { "label": "Dangerous Action", "score": -70, "feedback": "Detailed explanation of why this is devastating." },\n'
            '    { "label": "Sub-optimal Action", "score": 20, "feedback": "Why this is a weak response." },\n'
            '    { "label": "Secure Protocol", "score": 100, "feedback": "Excellent! Explain the correct policy." }\n'
            "  ]\n"
            "}\n"
            "Ensure the output is ONLY the raw JSON object. Use high creativity for themes."
        )

        user_prompt = f"Generate a unique, highly specific response drill scenario for the {chosen_category} category. Ensure it feels fresh and different from common training scenarios."

        try:
            response = await provider.client.chat.completions.create(
                model=provider.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.95,
                max_tokens=800
            )
            
            content = response.choices[0].message.content
            if not content:
                raise Exception("Empty compliance response from AI.")
                
            data = json.loads(content)
            
            # Validate format with Pydantic
            drill = DrillScenario(**data)
            return drill
            
        except Exception as e:
            logger.error(f"Failed to generate drill from LLM: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate random drill scenario.")
            
    except Exception as e:
        logger.error(f"Drills Route Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
