"""polymarket_structurer — turns a free-form prediction into a binary
Polymarket V2 market record (outcome parameters + resolution condition id).

Matches the prediction against live markets via the Polymarket Gamma API
(no key) to return a real `conditionId` + outcomes; falls back to a synthetic
lane when no live market matches, so the marketplace never stalls.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

import httpx

from logos.server import ReasoningTrace, Specialist, run

GAMMA = "https://gamma-api.polymarket.com/markets"
_STOP = {
    "will", "with", "this", "that", "from", "have", "been", "what", "when",
    "which", "does", "into", "than", "then", "before", "after", "next",
}

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "market_title": {"type": "string"},
        "outcome_parameters": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
        },
        "resolved_condition_id": {"type": "string"},
        "selected_outcome": {"type": "string"},
    },
    "required": ["outcome_parameters", "resolved_condition_id"],
}


def _structure(prediction: str, conviction: float) -> dict[str, Any]:
    """Synthetic fallback when no live market matches."""
    binary = ["YES", "NO"]
    selected = "NO" if prediction.lower().startswith(("no", "won't", "wont")) else "YES"
    condition = hashlib.sha256(prediction.encode()).hexdigest()[:32]
    return {
        "market_title": prediction[:80] + (" …" if len(prediction) > 80 else ""),
        "outcome_parameters": binary,
        "resolved_condition_id": f"0x{condition}",
        "selected_outcome": selected,
    }


def _select(prediction: str, outcomes: list[str]) -> str:
    if prediction.strip().lower().startswith(("no", "won't", "wont")):
        for o in outcomes:
            if o.lower() == "no":
                return o
        return outcomes[-1]
    for o in outcomes:
        if o.lower() == "yes":
            return o
    return outcomes[0]


def _map_market(market: dict[str, Any], prediction: str) -> dict[str, Any]:
    """Map a Gamma market to our schema. `outcomes` arrives as a JSON string."""
    outcomes = market.get("outcomes")
    if isinstance(outcomes, str):
        outcomes = json.loads(outcomes)
    outcomes = [str(o) for o in (outcomes or ["Yes", "No"])]
    cid = str(market.get("conditionId") or "")
    if not cid:
        raise ValueError("market has no conditionId")
    return {
        "market_title": str(market.get("question") or "")[:120],
        "outcome_parameters": outcomes,
        "resolved_condition_id": cid,
        "selected_outcome": _select(prediction, outcomes),
    }


def _best_market(
    markets: list[dict[str, Any]], prediction: str
) -> dict[str, Any] | None:
    """Highest keyword overlap with the prediction, tiebroken by liquidity."""
    words = {w for w in re.findall(r"[a-z]{4,}", prediction.lower()) if w not in _STOP}
    scored: list[tuple[int, float, dict[str, Any]]] = []
    for m in markets:
        q = str(m.get("question") or "").lower()
        overlap = sum(1 for w in words if w in q)
        if overlap:
            scored.append((overlap, float(m.get("liquidity") or 0.0), m))
    if not scored:
        return None
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return scored[0][2]


async def _fetch_market(prediction: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=6.0) as http:
        resp = await http.get(GAMMA, params={"closed": "false", "limit": 100})
        resp.raise_for_status()
        market = _best_market(resp.json(), prediction)
        if market is None:
            raise ValueError("no matching active market")
        return _map_market(market, prediction)


class PolymarketStructurer(Specialist):
    name = "polymarket_structurer"
    service_type = "polymarket_structuring"
    price_per_query_usdc_6 = 50  # $0.000050
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        prediction = str(
            payload.get("prediction", payload.get("question", "Will X happen?"))
        )
        conviction = float(payload.get("conviction", 0.5))
        trace.step(
            f"Structuring prediction (conviction={conviction:.2f}) against live "
            "Polymarket markets"
        )
        try:
            result = await _fetch_market(prediction)
            trace.step(
                f"Matched live market · condition {result['resolved_condition_id'][:14]}… "
                f"· selected {result['selected_outcome']!r}"
            )
            return result
        except Exception as e:
            trace.step(f"No live market match ({e}); structured a synthetic lane")
            return _structure(prediction, conviction)


SPECIALIST = PolymarketStructurer()


if __name__ == "__main__":
    run(SPECIALIST, port=7403)
