"""Parametric round-trip for every shipped specialist.

For each one we:
1. Import the module's SPECIALIST instance.
2. Call its `handle(...)` with a payload matching the seed expectations.
3. Validate the response against the specialist's own published schema.

This is the safety net that catches drift between specialist outputs and
the dashboard data shapes — if either side moves, this test fails first.
"""

from __future__ import annotations

import asyncio
import importlib
from typing import Any

import pytest

from logos.schemas import validate_response
from logos.server import ReasoningTrace, Specialist


@pytest.fixture(
    params=[
        ("specialists.mandarin_macro.main", {"text_url": "https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html"}),
        ("specialists.twitter_sentiment.main", {"query": "TSLA", "ticker": "TSLA"}),
        ("specialists.polymarket_structurer.main", {"prediction": "No Cut", "conviction": 0.88}),
        ("specialists.whale_tracker_eth.main", {"token_address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}),
        ("specialists.risk_checker.main", {"target_pool": "USDC/WETH", "leverage": 3.0, "size_usdc": 50_000.0}),
        ("specialists.news_summarizer.main", {"source_url": "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm"}),
        ("specialists.kelly_sizer.main", {"edge_percentage": 12.0, "odds_fraction": 1.4}),
        ("specialists.onchain_dex_data.main", {"pair_address": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"}),
    ],
    ids=lambda p: p[0].split(".")[1],
)
def specialist_case(request: pytest.FixtureRequest) -> tuple[Specialist, dict[str, Any]]:
    module_path, payload = request.param
    module = importlib.import_module(module_path)
    return module.SPECIALIST, payload


def test_specialist_handles_payload_and_passes_schema(
    specialist_case: tuple[Specialist, dict[str, Any]],
) -> None:
    specialist, payload = specialist_case
    trace = ReasoningTrace()
    result = asyncio.run(specialist.handle(payload, trace=trace))

    assert isinstance(result, dict), f"{specialist.name} did not return a dict"
    assert specialist.response_schema, f"{specialist.name} has no published schema"
    validate_response(result, specialist.response_schema)
    assert trace.steps, f"{specialist.name} did not emit any reasoning steps"


def test_specialist_metadata_is_consistent(
    specialist_case: tuple[Specialist, dict[str, Any]],
) -> None:
    specialist, _ = specialist_case
    assert specialist.name and specialist.name == specialist.name.lower()
    assert specialist.service_type
    assert specialist.price_per_query_usdc_6 > 0
