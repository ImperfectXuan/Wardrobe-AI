from abc import ABC, abstractmethod
from app.schemas.clothing import ClothingAttributes


class BaseModelStrategy(ABC):
    @abstractmethod
    async def recognize_clothing(self, image_url: str) -> ClothingAttributes:
        """分析衣物图片，返回结构化属性"""
        ...
