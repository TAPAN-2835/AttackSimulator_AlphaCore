from abc import ABC, abstractmethod

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate_phishing_email(
        self,
        attack_type: str,
        theme: str,
        difficulty: str,
        department: str,
        tone: str
    ) -> dict:
        """
        Generate a phishing email based on the given parameters.
        Returns a dictionary with keys: `subject`, `body`, `cta_text`.
        """
        pass
