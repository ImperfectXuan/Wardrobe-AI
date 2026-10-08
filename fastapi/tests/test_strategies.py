import base64
import json

import httpx
import pytest
from pydantic import ValidationError

from app.models import bailian, ollama
from app.models.bailian import BailianStrategy
from app.models.ollama import OllamaStrategy
from tests.conftest import FAKE_IMAGE_BYTES, RECOGNIZED

IMAGE_URL = "http://minio:9000/wardrobe-images/user-1/a.jpg"
EXPECTED_B64 = base64.b64encode(FAKE_IMAGE_BYTES).decode("utf-8")


def bailian_handler(content: str):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(200, content=FAKE_IMAGE_BYTES)
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    return handler


def ollama_handler(response_text: str):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(200, content=FAKE_IMAGE_BYTES)
        return httpx.Response(200, json={"response": response_text})

    return handler


class TestBailianStrategy:
    @pytest.mark.parametrize(
        "content",
        [
            json.dumps(RECOGNIZED, ensure_ascii=False),
            f"```json\n{json.dumps(RECOGNIZED, ensure_ascii=False)}\n```",
            f"  \n```\n{json.dumps(RECOGNIZED, ensure_ascii=False)}\n```\n  ",
        ],
        ids=["plain-json", "json-fence", "bare-fence-with-whitespace"],
    )
    async def test_parses_model_output(self, mock_http, content):
        mock_http(bailian_handler(content))

        result = await BailianStrategy().recognize_clothing(IMAGE_URL)

        assert result.model_dump() == RECOGNIZED

    async def test_sends_image_as_data_url_with_api_key(self, mock_http, monkeypatch):
        monkeypatch.setattr(bailian, "BAILIAN_API_KEY", "sk-test")
        sent = mock_http(bailian_handler(json.dumps(RECOGNIZED)))

        await BailianStrategy().recognize_clothing(IMAGE_URL)

        image_request, model_request = sent
        assert str(image_request.url) == IMAGE_URL
        assert model_request.headers["Authorization"] == "Bearer sk-test"
        image_part = json.loads(model_request.content)["messages"][0]["content"][1]
        assert image_part["image_url"]["url"] == f"data:image/jpeg;base64,{EXPECTED_B64}"

    async def test_missing_field_raises_validation_error(self, mock_http):
        incomplete = {key: value for key, value in RECOGNIZED.items() if key != "material"}
        mock_http(bailian_handler(json.dumps(incomplete)))

        with pytest.raises(ValidationError):
            await BailianStrategy().recognize_clothing(IMAGE_URL)

    async def test_image_download_failure_raises(self, mock_http):
        mock_http(lambda request: httpx.Response(404))

        with pytest.raises(httpx.HTTPStatusError):
            await BailianStrategy().recognize_clothing(IMAGE_URL)


class TestOllamaStrategy:
    async def test_parses_response_field(self, mock_http):
        mock_http(ollama_handler(json.dumps(RECOGNIZED, ensure_ascii=False)))

        result = await OllamaStrategy().recognize_clothing(IMAGE_URL)

        assert result.model_dump() == RECOGNIZED

    async def test_sends_base64_image_to_configured_host(self, mock_http, monkeypatch):
        monkeypatch.setattr(ollama, "OLLAMA_HOST", "http://ollama-test:11434")
        sent = mock_http(ollama_handler(json.dumps(RECOGNIZED)))

        await OllamaStrategy().recognize_clothing(IMAGE_URL)

        model_request = sent[1]
        assert str(model_request.url) == "http://ollama-test:11434/api/generate"
        body = json.loads(model_request.content)
        assert body["images"] == [EXPECTED_B64]
        assert body["format"] == "json"

    async def test_non_json_response_raises(self, mock_http):
        mock_http(ollama_handler("这是一件白衬衫"))

        with pytest.raises(json.JSONDecodeError):
            await OllamaStrategy().recognize_clothing(IMAGE_URL)

    async def test_model_server_error_raises(self, mock_http):
        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET":
                return httpx.Response(200, content=FAKE_IMAGE_BYTES)
            return httpx.Response(500)

        mock_http(handler)

        with pytest.raises(httpx.HTTPStatusError):
            await OllamaStrategy().recognize_clothing(IMAGE_URL)
