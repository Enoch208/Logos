"""risk_checker — slippage + liquidation risk on a target pool / position.

Slippage is estimated from the pool's *real* liquidity (Dexscreener, no key)
versus the trade size; liquidation probability is a leverage heuristic (no
clean public source). Falls back to a pure heuristic if the API is down.
"""

from __future__ import annotations

from typing import Any

import httpx

from logos.server import ReasoningTrace, Specialist, run

DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens"

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


def _slippage_band(liquidity_usd: float, size_usdc: float) -> str:
    """Real slippage estimate: the trade's footprint on the actual pool."""
    if liquidity_usd <= 0:
        return "EXTREME"
    ratio = size_usdc / liquidity_usd
    if ratio < 0.001:
        return "LOW"
    if ratio < 0.01:
        return "MEDIUM"
    if ratio < 0.05:
        return "HIGH"
    return "EXTREME"


def _liq_prob(leverage: float) -> float:
    """Leverage heuristic — no clean public source for liquidation odds."""
    if leverage <= 2:
        return 0.04
    if leverage <= 5:
        return 0.18
    if leverage <= 10:
        return 0.43
    return 0.71


def _evaluate(pool: str, leverage: float, size_usdc: float) -> dict[str, Any]:
    """Pure heuristic fallback (no live liquidity)."""
    if leverage <= 2 and size_usdc <= 10_000:
        band = "LOW"
    elif leverage <= 5 and size_usdc <= 100_000:
        band = "MEDIUM"
    elif leverage <= 10:
        band = "HIGH"
    else:
        band = "EXTREME"
    return {
        "target_pool": pool or "(unspecified)",
        "slippage_risk": band,
        "liquidation_probability": _liq_prob(leverage),
        "notes": f"heuristic · leverage={leverage}x, size=${size_usdc:,.0f}",
    }


async def _fetch_liquidity(pool: str) -> float:
    async with httpx.AsyncClient(timeout=6.0) as http:
        resp = await http.get(f"{DEXSCREENER}/{pool}")
        resp.raise_for_status()
        pairs = resp.json().get("pairs") or []
        if not pairs:
            raise ValueError("no pairs for pool")
        return max(float((p.get("liquidity") or {}).get("usd") or 0.0) for p in pairs)


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
        trace.step(f"Evaluating pool={pool!r}, leverage={leverage}x, size=${size:,.0f}")
        if pool:
            try:
                liquidity = await _fetch_liquidity(pool)
                result = {
                    "target_pool": pool,
                    "slippage_risk": _slippage_band(liquidity, size),
                    "liquidation_probability": _liq_prob(leverage),
                    "notes": f"live liquidity=${liquidity:,.0f}, size=${size:,.0f}, leverage={leverage}x",
                }
                trace.step(
                    f"Live liquidity ${liquidity:,.0f} → slippage {result['slippage_risk']}; "
                    f"liquidation {result['liquidation_probability']:.2f}"
                )
                return result
            except Exception as e:
                trace.step(f"Live liquidity unavailable ({e}); heuristic only")
        result = _evaluate(pool, leverage, size)
        trace.step(
            f"Slippage band {result['slippage_risk']}; "
            f"liquidation probability {result['liquidation_probability']:.2f}"
        )
        return result


SPECIALIST = RiskChecker()


if __name__ == "__main__":
    run(SPECIALIST, port=7405)
