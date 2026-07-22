import os
from app.models.base import BaseModelStrategy
from app.models.ollama import OllamaStrategy
from app.models.bailian import BailianStrategy
from app.schemas.clothing import ClothingAttributes


def _get_strategy() -> BaseModelStrategy:
    model = os.getenv("MODEL", "ollama")
    if model == "bailian":
        return BailianStrategy()
    return OllamaStrategy()


class RecognitionService:
    def __init__(self):
        self.strategy = _get_strategy()

    async def recognize(self, image_url: str) -> ClothingAttributes:
        return await self.strategy.recognize_clothing(image_url)
