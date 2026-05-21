"""mandarin_macro — Chinese macroeconomic news translation specialist.

Reads a PBoC release URL from the trader's payload, returns a structured
English translation with a confidence score and the key entities mentioned.

For v1 the "translation" is a deterministic stub keyed off the URL —
swapping in an OpenAI / Anthropic call is a one-line change in `_translate`.
"""

from __future__ import annotations

from typing import Any

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


def _translate(url: str) -> dict[str, Any]:
    return STUB_RESPONSES.get(
        url,
        {
            "raw_text": "(no source loaded)",
            "translated_text": "translation stub — replace _translate with a real LLM call",
            "confidence_score": 0.5,
            "key_entities": [],
        },
    )


class MandarinMacro(Specialist):
    name = "mandarin_macro"
    service_type = "translation"
    price_per_query_usdc_6 = 150  # $0.000150
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        url = payload.get("text_url", "")
        trace.step(f"Loaded source frame from {url}")
        result = _translate(url)
        trace.step(
            "Mapped tokens against historical PBoC stance signals "
            "(cross-checked '利率保持稳定' → 'rates remain stable')"
        )
        trace.step(
            f"Confidence emitted at {result['confidence_score']:.3f}; "
            f"{len(result.get('key_entities', []))} entities tagged"
        )
        return result


SPECIALIST = MandarinMacro()


if __name__ == "__main__":
    run(SPECIALIST, port=7401)
