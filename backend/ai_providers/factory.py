from .base import BaseAIProvider
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider

def get_ai_provider(model_choice: str) -> BaseAIProvider:
    """
    Returns the appropriate AI provider instance based on the user's model selection.
    Maps dropdown choices directly to the respective SDK providers.
    """
    # Normalize model choice
    clean_choice = str(model_choice).lower().strip()
    
    if "claude" in clean_choice:
        return ClaudeProvider()
    elif "gemini" in clean_choice:
        return GeminiProvider()
    elif "openai" in clean_choice or "gpt" in clean_choice:
        return OpenAIProvider(model_name="gpt-4o")
    elif "llama" in clean_choice or "mixtral" in clean_choice or "gemma" in clean_choice:
        # Default completely to Groq for open weights models
        return GroqProvider(model_name="llama-3.3-70b-versatile")
    
    # Fallback
    return GroqProvider(model_name="llama-3.3-70b-versatile")
