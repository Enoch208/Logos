"""Atlas — the flagship Polymarket V2 trader.

Atlas owns no opinions. It procures translation, sentiment, and structuring
from the marketplace, composes them into a binary bet, and posts to a
Polymarket V2 contract (or paper-trades against one).

This v1 demonstrates the *composition* — the Polymarket V2 post is stubbed
behind `_route_to_polymarket` so the demo runs without external chain calls.
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass
from typing import Any

from logos.client import LogosClient


@dataclass
class CompositionStep:
    sequence: int
    specialist: str
    service_type: str
    payload: dict[str, Any]
    response: dict[str, Any]
    cost_usdc: float
    trace_cid: str


@dataclass
class Composition:
    market_question: str
    target_venue: str
    steps: list[CompositionStep]

    @property
    def total_cost_usdc(self) -> float:
        return sum(s.cost_usdc for s in self.steps)


PBoC_URL = "https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html"


async def run_atlas(client: LogosClient) -> Composition:
    steps: list[CompositionStep] = []

    print("[atlas] procuring translation from mandarin_macro …")
    translation = await client.query(
        service_type="translation",
        payload={"text_url": PBoC_URL},
        max_price_usdc=0.0005,
    )
    steps.append(
        CompositionStep(
            sequence=1,
            specialist="mandarin_macro",
            service_type="translation",
            payload={"text_url": PBoC_URL},
            response=translation.payload,
            cost_usdc=0.000150,
            trace_cid=translation.trace_cid,
        )
    )

    if "market_sentiment" in client.specialist_directory:
        print("[atlas] procuring sentiment from twitter_sentiment …")
        sentiment = await client.query(
            service_type="market_sentiment",
            payload={"query": "PBOC LPR Cut Chinese Financial Twitter Data"},
            max_price_usdc=0.0005,
        )
        steps.append(
            CompositionStep(
                sequence=2,
                specialist="twitter_sentiment",
                service_type="market_sentiment",
                payload={"query": "PBOC LPR Cut"},
                response=sentiment.payload,
                cost_usdc=0.000080,
                trace_cid=sentiment.trace_cid,
            )
        )

    if "polymarket_structuring" in client.specialist_directory:
        print("[atlas] procuring structuring from polymarket_structurer …")
        structuring = await client.query(
            service_type="polymarket_structuring",
            payload={
                "prediction": "No Cut",
                "conviction": 0.88,
            },
            max_price_usdc=0.0005,
        )
        steps.append(
            CompositionStep(
                sequence=3,
                specialist="polymarket_structurer",
                service_type="polymarket_structuring",
                payload={"prediction": "No Cut", "conviction": 0.88},
                response=structuring.payload,
                cost_usdc=0.000050,
                trace_cid=structuring.trace_cid,
            )
        )

    if "capital_allocation" in client.specialist_directory:
        print("[atlas] procuring Kelly sizing from kelly_sizer …")
        # Derive an edge percentage from the sentiment score if we have it,
        # else fall back to a small positive edge.
        sentiment_score = 0.0
        for s in steps:
            if s.service_type == "market_sentiment":
                sentiment_score = float(s.response.get("sentiment_score", 0.0))
        edge_pct = abs(sentiment_score) * 15.0  # heuristic v1
        sizing_payload = {"edge_percentage": edge_pct, "odds_fraction": 1.0}
        sizing = await client.query(
            service_type="capital_allocation",
            payload=sizing_payload,
            max_price_usdc=0.0005,
        )
        steps.append(
            CompositionStep(
                sequence=len(steps) + 1,
                specialist="kelly_sizer",
                service_type="capital_allocation",
                payload=sizing_payload,
                response=sizing.payload,
                cost_usdc=0.000070,
                trace_cid=sizing.trace_cid,
            )
        )

    composition = Composition(
        market_question=(
            "Will the People's Bank of China (PBoC) cut the 1-Year Loan Prime Rate "
            "(LPR) before May 25, 2026?"
        ),
        target_venue="Polymarket V2",
        steps=steps,
    )
    await _route_to_polymarket(composition)
    return composition


async def _route_to_polymarket(comp: Composition) -> None:
    print(
        f"[atlas] would post to Polymarket V2 — venue={comp.target_venue!r}, "
        f"total cognition cost ${comp.total_cost_usdc:.6f} USDC across "
        f"{len(comp.steps)} specialist(s)"
    )


def _build_client() -> LogosClient:
    directory: dict[str, str] = {}
    for service, env_var in [
        ("translation", "MANDARIN_MACRO_URL"),
        ("market_sentiment", "TWITTER_SENTIMENT_URL"),
        ("polymarket_structuring", "POLYMARKET_STRUCTURER_URL"),
        ("capital_allocation", "KELLY_SIZER_URL"),
    ]:
        url = os.environ.get(env_var)
        if url:
            directory[service] = url
    if not directory:
        directory = {"translation": "http://localhost:7401"}
        print(
            "[atlas] no specialist endpoints in env — defaulting to "
            "translation=http://localhost:7401",
            file=sys.stderr,
        )
    return LogosClient(
        specialist_directory=directory,
        wallet_private_key=os.environ.get("ATLAS_PRIVATE_KEY"),
    )


async def _main() -> None:
    client = _build_client()
    composition = await run_atlas(client)
    print(
        f"\n[atlas] composition complete · ${composition.total_cost_usdc:.6f} USDC · "
        f"{len(composition.steps)} step(s)"
    )
    for step in composition.steps:
        print(
            f"  #{step.sequence} {step.specialist:<24} "
            f"${step.cost_usdc:.6f} → trace {step.trace_cid[:20]}…"
        )


if __name__ == "__main__":
    asyncio.run(_main())
