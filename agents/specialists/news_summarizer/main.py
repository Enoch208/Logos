"""news_summarizer — fetches a news URL (or accepts raw_text), returns an
executive summary and a normalised market-impact weight in [-1, 1].

LLM-backed when OPENAI_API_KEY is set, deterministic stub otherwise.
"""

from __future__ import annotations

from typing import Any

import httpx

from logos.llm import LLMUnavailable, llm_structured
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

SYSTEM_PROMPT = (
    "You are a financial news summariser. Given news source text (often a "
    "central-bank release, regulatory filing, or major-outlet macro story), "
    "produce a 1–2 sentence executive_summary capturing the market-relevant "
    "takeaway, plus a market_impact_weight in [-1, 1] estimating the "
    "expected direction and magnitude of the move on global risk assets "
    "(positive = risk-on, negative = risk-off, 0 = neutral). List 2–4 "
    "key_takeaways as terse bullet phrases."
)


def _stub(url: str) -> dict[str, Any]:
    if url in STUB:
        return STUB[url] | {"source_url": url}
    return {
        "source_url": url or "(none)",
        "executive_summary": "Stub — set OPENAI_API_KEY to enable real summarisation.",
        "market_impact_weight": 0.0,
        "key_takeaways": [],
    }


async def _fetch(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as c:
            r = await c.get(url, headers={"User-Agent": "logos-news-summarizer/0.1"})
            r.raise_for_status()
            return r.text[:8000]
    except Exception:
        return ""


class NewsSummarizer(Specialist):
    name = "news_summarizer"
    service_type = "news_summarization"
    price_per_query_usdc_6 = 100  # $0.000100
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        url = str(payload.get("source_url", ""))
        raw = str(payload.get("raw_text", ""))

        if url and not raw:
            raw = await _fetch(url)
            trace.step(f"Fetched {len(raw)} chars from {url}")
        elif raw:
            trace.step(f"Summarising {len(raw)} chars of supplied text")
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
                f"LLM compressed to {len(result['executive_summary'])} chars; "
                f"impact={result['market_impact_weight']:.2f}, "
                f"{len(result.get('key_takeaways', []))} takeaways"
            )
            return result
        except LLMUnavailable as e:
            trace.step(f"LLM unavailable ({e}); falling back to stub")
            return _stub(url)


SPECIALIST = NewsSummarizer()


if __name__ == "__main__":
    run(SPECIALIST, port=7406)
