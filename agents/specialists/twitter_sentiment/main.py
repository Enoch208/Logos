"""twitter_sentiment — composite market sentiment over a topical slice.

Accepts a free-form query string (or a ticker) and returns a score in
[-1, 1], the sample size considered, and the dominant emotion label.

When OPENAI_API_KEY is set the LLM does the classification end-to-end.
When the key isn't set the specialist falls back to a small
deterministic stub so the demo still runs in pure offline mode.
"""

from __future__ import annotations

from typing import Any

from logos.llm import LLMUnavailable, llm_structured_async
from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "ticker": {"type": "string"},
        "sentiment_score": {"type": "number", "minimum": -1.0, "maximum": 1.0},
        "sample_size": {"type": "integer", "minimum": 0},
        "dominant_emotion": {"type": "string"},
    },
    "required": ["sentiment_score", "dominant_emotion"],
}

STUB_SCORES: dict[str, dict[str, Any]] = {
    "PBOC LPR Cut Chinese Financial Twitter Data": {
        "sentiment_score": -0.68,
        "sample_size": 1420,
        "dominant_emotion": "BEARISH_EXPECTATION",
    },
    "TSLA": {
        "ticker": "TSLA",
        "sentiment_score": 0.31,
        "sample_size": 2840,
        "dominant_emotion": "CAUTIOUS_OPTIMISM",
    },
}

SYSTEM_PROMPT = (
    "You are a market-sentiment analyst. Given a topic or ticker, infer the "
    "dominant sentiment among traders and macro-focused commentators in the "
    "last 24h. Return a score in [-1, 1] where -1 is maximally bearish, +1 "
    "maximally bullish, 0 is neutral / mixed. Pick a SHOUTY_UPPER_CASE "
    "dominant_emotion (BEARISH_EXPECTATION, CAUTIOUS_OPTIMISM, EUPHORIA, "
    "FEAR, NEUTRAL, MIXED). If you can't infer with any confidence, return "
    "0.0 with NEUTRAL and a sample_size of 0."
)


def _stub(query: str) -> dict[str, Any]:
    if query in STUB_SCORES:
        return STUB_SCORES[query]
    return {
        "sentiment_score": 0.0,
        "sample_size": 0,
        "dominant_emotion": "NEUTRAL",
    }


class TwitterSentiment(Specialist):
    name = "twitter_sentiment"
    service_type = "market_sentiment"
    price_per_query_usdc_6 = 80  # $0.000080
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        query = str(payload.get("query") or payload.get("ticker") or "").strip()
        if not query:
            trace.step("Empty query — returning neutral stub")
            return _stub("")

        trace.step(f"Classifying sentiment for query={query!r}")
        try:
            result = await llm_structured_async(
                system=SYSTEM_PROMPT,
                user={"topic": query},
                schema=SCHEMA,
            )
            trace.step(
                f"LLM emitted {result['dominant_emotion']} at "
                f"score={result['sentiment_score']:.3f}"
            )
            return result
        except LLMUnavailable as e:
            trace.step(f"LLM unavailable ({e}); falling back to stub table")
            return _stub(query)


SPECIALIST = TwitterSentiment()


if __name__ == "__main__":
    run(SPECIALIST, port=7402)
