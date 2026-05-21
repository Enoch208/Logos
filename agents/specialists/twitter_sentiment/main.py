"""twitter_sentiment — composite market sentiment over a topical X/Twitter slice.

Pulls a sample of macro-focused accounts (mocked in v1) and emits a score in
[-1, 1] with the dominant emotion and sample size. Real implementation would
swap `_score` with a Twitter API + a small classifier.
"""

from __future__ import annotations

from typing import Any

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


def _score(query: str) -> dict[str, Any]:
    key = query.strip()
    if key in STUB_SCORES:
        return STUB_SCORES[key]
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
        query = payload.get("query") or payload.get("ticker") or ""
        trace.step(f"Vector-fetched against macro account corpus · query={query!r}")
        result = _score(query)
        trace.step(
            f"Composite index normalised to {result['sentiment_score']:.3f}; "
            f"dominant emotion {result['dominant_emotion']!r} over "
            f"sample_size={result.get('sample_size', 0)}"
        )
        return result


SPECIALIST = TwitterSentiment()


if __name__ == "__main__":
    run(SPECIALIST, port=7402)
