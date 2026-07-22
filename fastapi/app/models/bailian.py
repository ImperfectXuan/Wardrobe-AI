import os
import json
import httpx
from app.models.base import BaseModelStrategy
from app.schemas.clothing import ClothingAttributes

BAILIAN_API_KEY = os.getenv("BAILIAN_API_KEY", "")
BAILIAN_MODEL = os.getenv("BAILIAN_MODEL", "qwen-vl-max")

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


class BailianStrategy(BaseModelStrategy):
    async def recognize_clothing(self, image_url: str) -> ClothingAttributes:
        async with httpx.AsyncClient(timeout=30.0) as client:
            img_resp = await client.get(image_url)
            img_resp.raise_for_status()

        import base64
        img_b64 = base64.b64encode(img_resp.content).decode("utf-8")
        img_data_url = f"data:image/jpeg;base64,{img_b64}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {BAILIAN_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": BAILIAN_MODEL,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": PROMPT},
                                {"type": "image_url", "image_url": {"url": img_data_url}},
                            ],
                        }
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        # 清理可能的 markdown 代码块包裹
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("\n", 1)[0]
        raw = json.loads(content)
        return ClothingAttributes(**raw)
