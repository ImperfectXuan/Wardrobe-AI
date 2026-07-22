import os
import json
import httpx
from app.models.base import BaseModelStrategy
from app.schemas.clothing import ClothingAttributes

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "minicpm-v:latest")

PROMPT = """你是一个专业的服饰分析师。请分析这张衣物照片，返回 JSON 格式的属性：

{
  "name": "衣物简短名称（中文）",
  "category": "上衣|裤子|外套|鞋子|配饰",
  "color": "主要颜色（中文）",
  "season": "春|夏|秋|冬|春夏|秋冬|四季",
  "style": "商务|休闲|运动|极简|工装|优雅",
  "material": "材质（中文，如纯棉、羊绒、皮革）"
}

只返回 JSON，不要包含其他文字。"""


class OllamaStrategy(BaseModelStrategy):
    async def recognize_clothing(self, image_url: str) -> ClothingAttributes:
        # 将图片下载为 base64
        async with httpx.AsyncClient(timeout=30.0) as client:
            img_resp = await client.get(image_url)
            img_resp.raise_for_status()

        import base64
        img_b64 = base64.b64encode(img_resp.content).decode("utf-8")

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": PROMPT,
                    "images": [img_b64],
                    "stream": False,
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        # Ollama 返回的 response 字段是 JSON 字符串
        raw = json.loads(data["response"])
        return ClothingAttributes(**raw)
