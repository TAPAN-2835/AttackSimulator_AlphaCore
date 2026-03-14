import asyncio
from schemas.request_models import AIEmailGenerateRequest
from ai_generation.routes import generate_phishing_email

async def main():
    req = AIEmailGenerateRequest(
        attack_type='phishing',
        theme='IT',
        difficulty='Easy',
        department='HR',
        tone='Urgent',
        model='OpenAI GPT'
    )
    print("Sending request to LLM...")
    res = await generate_phishing_email(req)
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
