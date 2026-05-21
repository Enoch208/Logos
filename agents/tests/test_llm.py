"""Tests for the shared LLM client.

These never hit the real OpenAI API — `OPENAI_API_KEY` is cleared in the
fixtures, and any client construction is mocked. The point is to lock in
the contract: when no key is set, llm_structured raises LLMUnavailable
(which every specialist's `handle` catches to fall back to its stub).
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from logos.llm import LLMUnavailable, _strict_schema, is_configured, llm_structured


def test_is_configured_false_when_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert is_configured() is False


def test_is_configured_true_when_key_set(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    assert is_configured() is True


def test_llm_structured_raises_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(LLMUnavailable):
        llm_structured(system="x", user="y", schema={"type": "object", "properties": {}})


def test_strict_schema_adds_required_and_disables_additional() -> None:
    relaxed = {
        "type": "object",
        "properties": {"a": {"type": "string"}, "b": {"type": "number"}},
        "required": ["a"],
    }
    strict = _strict_schema(relaxed)
    assert strict["additionalProperties"] is False
    assert set(strict["required"]) == {"a", "b"}


def test_strict_schema_recurses_into_nested_objects() -> None:
    relaxed = {
        "type": "object",
        "properties": {
            "inner": {
                "type": "object",
                "properties": {"x": {"type": "string"}},
            }
        },
    }
    strict = _strict_schema(relaxed)
    inner = strict["properties"]["inner"]
    assert inner["additionalProperties"] is False
    assert inner["required"] == ["x"]


def test_llm_structured_returns_parsed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    fake = MagicMock()
    fake.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content='{"sentiment_score": -0.42, "dominant_emotion": "FEAR"}'))]
    )
    with patch("openai.OpenAI", return_value=fake):
        out = llm_structured(
            system="classify sentiment",
            user="$TSLA",
            schema={
                "type": "object",
                "properties": {
                    "sentiment_score": {"type": "number"},
                    "dominant_emotion": {"type": "string"},
                },
                "required": ["sentiment_score", "dominant_emotion"],
            },
        )
    assert out == {"sentiment_score": -0.42, "dominant_emotion": "FEAR"}


def test_llm_structured_raises_on_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    fake = MagicMock()
    fake.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="not json"))]
    )
    with patch("openai.OpenAI", return_value=fake):
        with pytest.raises(LLMUnavailable, match="not valid JSON"):
            llm_structured(system="x", user="y", schema={"type": "object", "properties": {}})


def test_llm_structured_raises_when_api_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    fake = MagicMock()
    fake.chat.completions.create.side_effect = RuntimeError("upstream 500")
    with patch("openai.OpenAI", return_value=fake):
        with pytest.raises(LLMUnavailable, match="OpenAI call failed"):
            llm_structured(system="x", user="y", schema={"type": "object", "properties": {}})
