from pydantic import BaseModel


class RecognizeRequest(BaseModel):
    image_url: str


class ClothingAttributes(BaseModel):
    name: str
    category: str
    color: str
    season: str
    style: str
    material: str


class RecognizeResponse(BaseModel):
    success: bool
    data: ClothingAttributes | None = None
    error: str | None = None
