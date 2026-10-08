import pytest
from fastapi.testclient import TestClient

from app.api import routes
from app.main import app
from app.schemas.clothing import ClothingAttributes
from tests.conftest import RECOGNIZED

client = TestClient(app)


class FakeRecognitionService:
    error: Exception | None = None

    async def recognize(self, image_url: str) -> ClothingAttributes:
        if self.error is not None:
            raise self.error
        return ClothingAttributes(**RECOGNIZED)


@pytest.fixture
def fake_service(monkeypatch: pytest.MonkeyPatch) -> type[FakeRecognitionService]:
    FakeRecognitionService.error = None
    monkeypatch.setattr(routes, "RecognitionService", FakeRecognitionService)
    return FakeRecognitionService


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_recognize_success(fake_service):
    response = client.post("/recognize", json={"image_url": "http://minio/a.jpg"})

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": RECOGNIZED, "error": None}


def test_recognize_failure_returns_error_envelope(fake_service):
    fake_service.error = RuntimeError("模型超时")

    response = client.post("/recognize", json={"image_url": "http://minio/a.jpg"})

    assert response.status_code == 200
    assert response.json() == {"success": False, "data": None, "error": "模型超时"}


def test_recognize_requires_image_url(fake_service):
    response = client.post("/recognize", json={})

    assert response.status_code == 422
