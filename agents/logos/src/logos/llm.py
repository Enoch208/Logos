"""Thin shared LLM client.

Each LLM-shaped specialist (translation, sentiment, summarisation) calls
`llm_structured()` with a system prompt + user payload + a JSON schema for
the response. The client returns a parsed dict that already validates
against the schema (OpenAI's structured-output mode handles the
validation server-side, so the specialist doesn't need to retry on
malformed JSON).

Without `OPENAI_API_KEY` in env, every call raises `LLMUnavailable`; the
specialist's `handle` is expected to catch that and fall back to a
deterministic stub. This keeps the fleet usable in dev / hackathon
demos without burning API credits.
"""

from __future__ import annotations

import json
import os
from typing import Any


DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
"""Cheap by default. Override per-call or via env. `gpt-4o-mini` handles
the demo schemas (translation, sentiment, summarisation) for ~$0.0001 per
specialist round — cheap enough that one Atlas composition costs less
than a cent of OpenAI even before the Nanopayment receipts settle."""


class LLMUnavailable(RuntimeError):
    """Raised when no LLM credentials are configured, or when the API call
    fails. Specialists should catch this and fall back to their stub."""


def is_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def llm_structured(
    *,
    system: str,
    user: str | dict[str, Any],
    schema: dict[str, Any],
    model: str | None = None,
    temperature: float = 0.0,
) -> dict[str, Any]:
    """Calls OpenAI's structured-output endpoint and returns the parsed
    response. Raises LLMUnavailable on any failure or if no API key is set."""
    if not is_configured():
        raise LLMUnavailable("OPENAI_API_KEY not set")

    try:
        from openai import OpenAI  # type: ignore[import-not-found]
    except ImportError as e:
        raise LLMUnavailable(f"openai package not installed: {e}") from e

    user_text = user if isinstance(user, str) else json.dumps(user, sort_keys=True)

    try:
        client = OpenAI()
        resp = client.chat.completions.create(
            model=model or DEFAULT_MODEL,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "specialist_response",
                    "strict": True,
                    "schema": _strict_schema(schema),
                },
            },
        )
    except Exception as e:
        raise LLMUnavailable(f"OpenAI call failed: {e}") from e

    content = resp.choices[0].message.content
    if not content:
        raise LLMUnavailable("OpenAI returned empty content")
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise LLMUnavailable(f"OpenAI response was not valid JSON: {e}") from e


def _strict_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """OpenAI's strict mode requires every property to also appear in
    `required` and `additionalProperties` to be false. Augment a relaxed
    JSON Schema so the specialist's existing schemas slot in without
    re-authoring."""
    out: dict[str, Any] = dict(schema)
    if out.get("type") == "object":
        props = out.get("properties", {})
        out["properties"] = props
        out["required"] = list(props.keys())
        out["additionalProperties"] = False
        for k, sub in props.items():
            if isinstance(sub, dict) and sub.get("type") == "object":
                props[k] = _strict_schema(sub)
    return out
