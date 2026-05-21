"""mandarin_macro — Chinese macroeconomic news translation specialist.

Reads a PBoC release URL (or raw text) from the trader's payload and
returns a structured English translation with a confidence score and the
key entities mentioned. Calls OpenAI when OPENAI_API_KEY is set; falls
back to a small deterministic stub otherwise so the demo still runs.
"""

from __future__ import annotations

from typing import Any

import httpx

from logos.llm import LLMUnavailable, llm_structured
from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "raw_text": {"type": "string"},
        "translated_text": {"type": "string"},
        "confidence_score": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "key_entities": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["translated_text", "confidence_score"],
}

STUB_RESPONSES = {
    "https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html": {
        "raw_text": "中国人民银行公告：1年期贷款市场报价利率保持稳定。",
        "translated_text": (
            "PBOC maintains flexible containment strategies. Internal minutes "
            "suggest LPR adjustments remain indexed closely to liquidity metrics "
            "trailing through late Q2."
        ),
        "confidence_score": 0.992,
        "key_entities": ["PBoC", "LPR", "Q2 2026", "liquidity"],
    },
}

SYSTEM_PROMPT = (
    "You are a macro-finance translator specialising in Chinese central bank "
    "and finance ministry releases. Given Mandarin source text (or a URL "
    "pointing at one), produce a faithful, finance-literate English "
    "translation. Mark your confidence on the [0, 1] range — be honest, "
    "lower scores for short / ambiguous source. Extract the most important "
    "named entities (institutions, instruments, dates, numeric levels)."
)


def _stub(url: str) -> dict[str, Any]:
    return STUB_RESPONSES.get(
        url,
        {
            "raw_text": "(no source loaded)",
            "translated_text": "stub — set OPENAI_API_KEY to enable real translation",
            "confidence_score": 0.5,
            "key_entities": [],
        },
    )


async def _fetch(url: str) -> str:
    """Best-effort fetch of the source page. Returns "" on any failure;
    the LLM can still translate from the URL alone when the site blocks
    scraping."""
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as c:
            r = await c.get(url, headers={"User-Agent": "logos-mandarin-macro/0.1"})
            r.raise_for_status()
            return r.text[:8000]  # cap so we don't blow context
    except Exception:
        return ""


class MandarinMacro(Specialist):
    name = "mandarin_macro"
    service_type = "translation"
    price_per_query_usdc_6 = 150  # $0.000150
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        url = str(payload.get("text_url", ""))
        raw = str(payload.get("raw_text", ""))

        if url and not raw:
            raw = await _fetch(url)
            trace.step(f"Fetched {len(raw)} chars from {url}")
        elif raw:
            trace.step(f"Translating {len(raw)} chars of supplied text")
        else:
            trace.step("No source supplied — returning stub")
            return _stub(url)

        try:
            result = llm_structured(
                system=SYSTEM_PROMPT,
                user={"source_url": url, "source_text": raw or url},
                schema=SCHEMA,
            )
            trace.step(
                f"LLM emitted confidence={result.get('confidence_score', 0):.3f}, "
                f"{len(result.get('key_entities', []))} entities"
            )
            return result
        except LLMUnavailable as e:
            trace.step(f"LLM unavailable ({e}); falling back to stub")
            return _stub(url)


SPECIALIST = MandarinMacro()


if __name__ == "__main__":
    run(SPECIALIST, port=7401)
