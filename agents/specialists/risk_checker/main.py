"""risk_checker — slippage + liquidation risk on a target pool / position.

Returns a categorical slippage band and a [0, 1] liquidation probability.
Real impl would read pool depth + leverage telemetry; v1 is a stub.
"""

from __future__ import annotations

from typing import Any

from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "target_pool": {"type": "string"},
        "slippage_risk": {
            "type": "string",
            "enum": ["LOW", "MEDIUM", "HIGH", "EXTREME"],
        },
        "liquidation_probability": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "notes": {"type": "string"},
    },
    "required": ["slippage_risk", "liquidation_probability"],
}


def _evaluate(pool: str, leverage: float, size_usdc: float) -> dict[str, Any]:
    band: str
    liq: float
    if leverage <= 2 and size_usdc <= 10_000:
        band, liq = "LOW", 0.04
    elif leverage <= 5 and size_usdc <= 100_000:
        band, liq = "MEDIUM", 0.18
    elif leverage <= 10:
        band, liq = "HIGH", 0.43
    else:
        band, liq = "EXTREME", 0.71
    return {
        "target_pool": pool or "(unspecified)",
        "slippage_risk": band,
        "liquidation_probability": liq,
        "notes": f"leverage={leverage}x, size=${size_usdc:,.0f}",
    }


class RiskChecker(Specialist):
    name = "risk_checker"
    service_type = "risk_evaluation"
    price_per_query_usdc_6 = 120  # $0.000120
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        pool = str(payload.get("target_pool", ""))
        leverage = float(payload.get("leverage", 1.0))
        size = float(payload.get("size_usdc", 1_000.0))
        trace.step(
            f"Evaluating pool={pool!r}, leverage={leverage}x, size=${size:,.0f}"
        )
        result = _evaluate(pool, leverage, size)
        trace.step(
            f"Slippage band {result['slippage_risk']}; "
            f"liquidation probability {result['liquidation_probability']:.2f}"
        )
        return result


SPECIALIST = RiskChecker()


if __name__ == "__main__":
    run(SPECIALIST, port=7405)
