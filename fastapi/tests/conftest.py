from collections.abc import Callable

import httpx
import pytest

Handler = Callable[[httpx.Request], httpx.Response]

FAKE_IMAGE_BYTES = b"fake-image-bytes"

RECOGNIZED = {
    "name": "白衬衫",
    "category": "上衣",
    "color": "白色",
    "season": "四季",
    "style": "商务",
    "material": "纯棉",
}


@pytest.fixture
def mock_http(monkeypatch: pytest.MonkeyPatch) -> Callable[[Handler], list[httpx.Request]]:
    """让策略内部新建的 AsyncClient 走 MockTransport，返回已发出的请求列表供断言。"""

    def install(handler: Handler) -> list[httpx.Request]:
        sent: list[httpx.Request] = []
        real_client = httpx.AsyncClient

        def recording_handler(request: httpx.Request) -> httpx.Response:
            sent.append(request)
            return handler(request)

        def client_factory(*args, **kwargs) -> httpx.AsyncClient:
            return real_client(*args, transport=httpx.MockTransport(recording_handler), **kwargs)

        monkeypatch.setattr(httpx, "AsyncClient", client_factory)
        return sent

    return install
