from fastapi import APIRouter, HTTPException
from app.schemas.clothing import RecognizeRequest, RecognizeResponse
from app.services.recognition import RecognitionService

router = APIRouter()


@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_clothing(req: RecognizeRequest):
    try:
        service = RecognitionService()
        attrs = await service.recognize(req.image_url)
        return RecognizeResponse(success=True, data=attrs)
    except Exception as e:
        return RecognizeResponse(success=False, error=str(e))
