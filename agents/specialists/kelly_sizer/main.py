"""kelly_sizer — fractional Kelly bet sizing.

Given an edge percentage and the odds the venue offers, returns the
fraction of bankroll a trader should commit. v1 implements a true Kelly
formula (no LLM stub needed) — useful sanity that the framework also
works for deterministic math services, not just LLM wrappers.
"""

from __future__ import annotations

from typing import Any

from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "edge_percentage": {"type": "number"},
        "odds_fraction": {"type": "number"},
        "recommended_allocation": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "fractional_kelly": {"type": "number"},
    },
    "required": ["recommended_allocation"],
}


def _kelly(edge_pct: float, odds: float, fraction: float = 0.5) -> dict[str, Any]:
    """Kelly criterion: f* = (b·p − q) / b, where b=odds, p=win prob, q=1−p.

    edge_pct is the trader's perceived edge over the venue's implied
    probability. We convert to win probability via implied + edge.
    """
    if odds <= 0:
        full = 0.0
    else:
        implied_p = 1.0 / (1.0 + odds)
        p = max(0.0, min(1.0, implied_p + edge_pct / 100.0))
        q = 1.0 - p
        full = max(0.0, min(1.0, (odds * p - q) / odds))
    sized = full * fraction
    return {
        "edge_percentage": edge_pct,
        "odds_fraction": odds,
        "recommended_allocation": round(sized, 4),
        "fractional_kelly": fraction,
    }


class KellySizer(Specialist):
    name = "kelly_sizer"
    service_type = "capital_allocation"
    price_per_query_usdc_6 = 70  # $0.000070
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        edge = float(payload.get("edge_percentage", 0.0))
        odds = float(payload.get("odds_fraction", 1.0))
        fraction = float(payload.get("fractional", 0.5))
        trace.step(
            f"Inputs · edge={edge}%, odds={odds}, fractional_kelly={fraction}"
        )
        result = _kelly(edge, odds, fraction)
        trace.step(
            f"Recommended allocation = {result['recommended_allocation']:.4f} "
            f"of bankroll (full Kelly × {fraction})"
        )
        return result


SPECIALIST = KellySizer()


if __name__ == "__main__":
    run(SPECIALIST, port=7407)
