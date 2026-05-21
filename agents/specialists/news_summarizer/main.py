"""news_summarizer — pulls a news URL, returns an executive summary + a
normalised market-impact weight in [-1, 1].
"""

from __future__ import annotations

from typing import Any

from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "source_url": {"type": "string"},
        "executive_summary": {"type": "string"},
        "market_impact_weight": {"type": "number", "minimum": -1.0, "maximum": 1.0},
        "key_takeaways": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["executive_summary", "market_impact_weight"],
}

STUB: dict[str, dict[str, Any]] = {
    "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm": {
        "executive_summary": (
            "Federal Reserve holds the target range for the federal funds rate "
            "steady; dot plot suggests one cut by year-end."
        ),
        "market_impact_weight": 0.42,
        "key_takeaways": [
            "Rates unchanged",
            "Dot plot: one cut likely H2",
            "Inflation expectations stable",
        ],
    },
}


def _summarise(url: str) -> dict[str, Any]:
    if url in STUB:
        return STUB[url] | {"source_url": url}
    return {
        "source_url": url or "(none)",
        "executive_summary": "Summary stub — replace _summarise with a real LLM call.",
        "market_impact_weight": 0.0,
        "key_takeaways": [],
    }


class NewsSummarizer(Specialist):
    name = "news_summarizer"
    service_type = "news_summarization"
    price_per_query_usdc_6 = 100  # $0.000100
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        url = str(payload.get("source_url", ""))
        trace.step(f"Loaded source {url or '<unspecified>'}")
        result = _summarise(url)
        trace.step(
            f"Compressed to {len(result['executive_summary'])} chars; "
            f"market_impact_weight={result['market_impact_weight']:.2f}"
        )
        return result


SPECIALIST = NewsSummarizer()


if __name__ == "__main__":
    run(SPECIALIST, port=7406)
