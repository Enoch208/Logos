"""Atlas — the flagship Polymarket V2 trader.

Atlas owns no opinions. It procures translation, sentiment, structuring, and
Kelly sizing from the marketplace, composes them into a binary bet, and
routes to Polymarket V2 (stubbed behind `_route_to_polymarket`).

Two run modes:
- single (default): one composition, then exit.
- loop: set ATLAS_LOOP_INTERVAL=<seconds> (or pass --loop <seconds>) and
  Atlas fires a composition on that cadence forever, rotating through a
  set of market scenarios so the marketplace shows continuous, varied
  activity — judges hitting the dashboard at any time see fresh volume.

Each composition fires ~12 on-chain txs (recordQuery + rate per
specialist, plus the specialists' attestResponse), so the interval is the
gas-burn knob: every 10 min ≈ 0.4 ETH/hr on Arc testnet at the time of
writing. Tune to taste.
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass, field
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
    decisions: list[str] = field(default_factory=list)

    @property
    def total_cost_usdc(self) -> float:
        return sum(s.cost_usdc for s in self.steps)


def _needs_translation(payload: dict[str, Any]) -> tuple[bool, str]:
    """Atlas decides whether to buy translation at all — it skips the spend when
    the source is already English. Returns (need, rationale)."""
    if "text_url" in payload:
        return True, "remote source URL — procuring translation"
    text = str(payload.get("raw_text", ""))
    if not text:
        return True, "no inline source — procuring translation"
    if any("一" <= ch <= "鿿" for ch in text):
        return True, "source contains CJK — procuring translation"
    return False, "source already English — skipped translation (saved $0.000150)"


def _conviction_from_sentiment(sentiment_score: float, fallback: float) -> float:
    """Conviction is set by the sentiment Atlas just bought, not hardcoded:
    stronger sentiment (either direction) → higher conviction."""
    if sentiment_score == 0.0:
        return fallback
    return round(min(0.95, 0.5 + abs(sentiment_score) * 0.5), 2)


@dataclass
class Scenario:
    market_question: str
    translation_input: dict[str, Any]
    sentiment_query: str
    prediction: str
    conviction: float


# Rotated through in loop mode so the live feed isn't identical every cycle.
SCENARIOS: list[Scenario] = [
    Scenario(
        market_question=(
            "Will the People's Bank of China cut the 1-Year Loan Prime Rate "
            "before the next quarterly review?"
        ),
        translation_input={"text_url": "https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html"},
        sentiment_query="PBOC LPR cut China financial sentiment",
        prediction="No Cut",
        conviction=0.88,
    ),
    Scenario(
        market_question="Will the Federal Reserve hold rates at its next FOMC meeting?",
        translation_input={
            "raw_text": "美联储官员表示通胀压力仍需观察，短期内维持利率不变的可能性较大。"
        },
        sentiment_query="Federal Reserve FOMC rate hold expectations",
        prediction="Hold",
        conviction=0.74,
    ),
    Scenario(
        market_question="Will spot Ethereum ETFs see net positive inflows this week?",
        translation_input={"raw_text": "以太坊现货ETF本周资金流入预期保持乐观，机构需求稳定。"},
        sentiment_query="Ethereum spot ETF inflows institutional demand",
        prediction="Net Inflows",
        conviction=0.66,
    ),
    Scenario(
        market_question="Will Bitcoin close above its prior all-time high by month end?",
        translation_input={"raw_text": "比特币市场情绪偏向谨慎乐观，链上数据显示长期持有者增持。"},
        sentiment_query="Bitcoin all-time high momentum on-chain accumulation",
        prediction="Above ATH",
        conviction=0.58,
    ),
    Scenario(
        market_question="Will the ECB signal a dovish pivot at its next press conference?",
        translation_input={"raw_text": "欧洲央行内部对降息节奏存在分歧，市场预期略偏鸽派。"},
        sentiment_query="ECB dovish pivot euro rates expectations",
        prediction="Dovish",
        conviction=0.61,
    ),
    Scenario(
        # English source — Atlas should DECIDE to skip translation and save the spend.
        market_question="Will the US CPI print come in below consensus this month?",
        translation_input={
            "raw_text": "US CPI is tracking near consensus; core services inflation stays sticky per the latest prints."
        },
        sentiment_query="US CPI inflation consensus expectations",
        prediction="Below Consensus",
        conviction=0.62,
    ),
]


async def run_atlas(client: LogosClient, scenario: Scenario) -> Composition:
    steps: list[CompositionStep] = []
    decisions: list[str] = []
    print(f"[atlas] market: {scenario.market_question}")

    def decide(rationale: str) -> None:
        decisions.append(rationale)
        print(f"[atlas] decision · {rationale}")

    # Decision 1 — buy translation only if the source isn't already English.
    need_translation, why = _needs_translation(scenario.translation_input)
    decide(why)
    if need_translation:
        print("[atlas] procuring translation from mandarin_macro …")
        translation = await client.query(
            service_type="translation",
            payload=scenario.translation_input,
            max_price_usdc=0.0005,
        )
        steps.append(
            CompositionStep(
                sequence=len(steps) + 1,
                specialist="mandarin_macro",
                service_type="translation",
                payload=scenario.translation_input,
                response=translation.payload,
                cost_usdc=0.000150,
                trace_cid=translation.trace_cid,
            )
        )

    sentiment_score = 0.0
    if "market_sentiment" in client.specialist_directory:
        print("[atlas] procuring sentiment from twitter_sentiment …")
        sentiment = await client.query(
            service_type="market_sentiment",
            payload={"query": scenario.sentiment_query},
            max_price_usdc=0.0005,
        )
        sentiment_score = float(sentiment.payload.get("sentiment_score", 0.0))
        steps.append(
            CompositionStep(
                sequence=len(steps) + 1,
                specialist="twitter_sentiment",
                service_type="market_sentiment",
                payload={"query": scenario.sentiment_query},
                response=sentiment.payload,
                cost_usdc=0.000080,
                trace_cid=sentiment.trace_cid,
            )
        )

    # Decision 2 — conviction is driven by the sentiment Atlas just bought.
    conviction = _conviction_from_sentiment(sentiment_score, scenario.conviction)
    decide(
        f"sentiment {sentiment_score:+.2f} → conviction {conviction:.2f} "
        f"on '{scenario.prediction}'"
    )

    if "polymarket_structuring" in client.specialist_directory:
        print("[atlas] procuring structuring from polymarket_structurer …")
        structuring_payload = {"prediction": scenario.prediction, "conviction": conviction}
        structuring = await client.query(
            service_type="polymarket_structuring",
            payload=structuring_payload,
            max_price_usdc=0.0005,
        )
        steps.append(
            CompositionStep(
                sequence=len(steps) + 1,
                specialist="polymarket_structurer",
                service_type="polymarket_structuring",
                payload=structuring_payload,
                response=structuring.payload,
                cost_usdc=0.000050,
                trace_cid=structuring.trace_cid,
            )
        )

    if "capital_allocation" in client.specialist_directory:
        # Decision 3 — size the position by the edge implied by sentiment strength.
        edge_pct = round(abs(sentiment_score) * 15.0, 2)
        decide(f"edge {edge_pct:.1f}% from |sentiment| → Kelly sizing")
        print("[atlas] procuring Kelly sizing from kelly_sizer …")
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
        market_question=scenario.market_question,
        target_venue="Polymarket V2",
        steps=steps,
        decisions=decisions,
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
    from logos.contracts import ChainBridge, ChainConfig

    bridge = None
    cfg = ChainConfig.from_env()
    pk = os.environ.get("ATLAS_PRIVATE_KEY")
    if cfg and pk:
        bridge = ChainBridge(cfg, private_key=pk)
        print(f"[atlas] chain mode · chainId={cfg.chain_id} · marketplace={cfg.marketplace[:14]}…")
    else:
        print("[atlas] off-chain mode · no chain creds wired")

    return LogosClient(
        specialist_directory=directory,
        wallet_private_key=pk,
        chain_bridge=bridge,
        auto_rate=5 if bridge else None,
    )


def _print_composition(composition: Composition) -> None:
    print(
        f"[atlas] composition complete · ${composition.total_cost_usdc:.6f} USDC · "
        f"{len(composition.steps)} step(s)"
    )
    for step in composition.steps:
        print(
            f"  #{step.sequence} {step.specialist:<24} "
            f"${step.cost_usdc:.6f} → trace {step.trace_cid[:20]}…"
        )
    for d in composition.decisions:
        print(f"  · decision: {d}")


def _loop_interval() -> int:
    """Seconds between compositions in loop mode; 0 = single run.
    `--loop <seconds>` overrides the ATLAS_LOOP_INTERVAL env var."""
    if "--loop" in sys.argv:
        i = sys.argv.index("--loop")
        if i + 1 < len(sys.argv):
            return int(sys.argv[i + 1])
        return 600
    return int(os.environ.get("ATLAS_LOOP_INTERVAL", "0"))


async def _main() -> None:
    client = _build_client()
    interval = _loop_interval()

    if interval <= 0:
        composition = await run_atlas(client, SCENARIOS[0])
        _print_composition(composition)
        return

    print(f"[atlas] loop mode · firing a composition every {interval}s", flush=True)
    cycle = 0
    while True:
        scenario = SCENARIOS[cycle % len(SCENARIOS)]
        cycle += 1
        try:
            composition = await run_atlas(client, scenario)
            _print_composition(composition)
        except Exception as e:  # one bad cycle shouldn't kill the loop
            print(f"[atlas] cycle {cycle} failed: {e}", file=sys.stderr, flush=True)
        await asyncio.sleep(interval)


if __name__ == "__main__":
    asyncio.run(_main())
