"""onchain_dex_data — pair-level DEX telemetry: 24h volume + liquidity depth.

v1 returns deterministic stubs per known pair. Real impl would query a
subgraph or DEX router contract.
"""

from __future__ import annotations

from typing import Any

from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "pair_address": {"type": "string"},
        "volume_24h_usdc": {"type": "number", "minimum": 0.0},
        "liquidity_depth_usdc": {"type": "number", "minimum": 0.0},
        "fee_tier_bps": {"type": "integer"},
    },
    "required": ["volume_24h_usdc", "liquidity_depth_usdc"],
}

STUB: dict[str, dict[str, Any]] = {
    # USDC / WETH 0.05% on Uniswap V3
    "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640": {
        "volume_24h_usdc": 188_420_000.0,
        "liquidity_depth_usdc": 412_000_000.0,
        "fee_tier_bps": 5,
    },
    # WBTC / USDC 0.30%
    "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35": {
        "volume_24h_usdc": 41_220_000.0,
        "liquidity_depth_usdc": 78_500_000.0,
        "fee_tier_bps": 30,
    },
}


def _telemetry(addr: str) -> dict[str, Any]:
    key = addr.lower()
    if key in STUB:
        out = STUB[key].copy()
        out["pair_address"] = addr
        return out
    return {
        "pair_address": addr or "0x" + "0" * 40,
        "volume_24h_usdc": 0.0,
        "liquidity_depth_usdc": 0.0,
    }


class OnchainDexData(Specialist):
    name = "onchain_dex_data"
    service_type = "dex_telemetry"
    price_per_query_usdc_6 = 250  # $0.000250
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        addr = str(payload.get("pair_address", ""))
        trace.step(f"Resolving pair telemetry for {addr or '<unspecified>'}")
        result = _telemetry(addr)
        trace.step(
            f"24h volume ${result['volume_24h_usdc']:,.0f} · "
            f"liquidity ${result['liquidity_depth_usdc']:,.0f}"
        )
        return result


SPECIALIST = OnchainDexData()


if __name__ == "__main__":
    run(SPECIALIST, port=7408)
