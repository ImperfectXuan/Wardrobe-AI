import pytest

from app.models.bailian import BailianStrategy
from app.models.ollama import OllamaStrategy
from app.services.recognition import RecognitionService


@pytest.mark.parametrize(
    ("model", "expected"),
    [
        ("bailian", BailianStrategy),
        ("ollama", OllamaStrategy),
        ("unknown-model", OllamaStrategy),
    ],
)
def test_strategy_selected_by_model_env(monkeypatch: pytest.MonkeyPatch, model, expected):
    monkeypatch.setenv("MODEL", model)

    assert isinstance(RecognitionService().strategy, expected)


def test_defaults_to_ollama_when_model_env_missing(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("MODEL", raising=False)

    assert isinstance(RecognitionService().strategy, OllamaStrategy)
