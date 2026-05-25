"""onchain_dex_data — pair-level DEX telemetry: 24h volume + liquidity depth.

Pulls live data from the Dexscreener public API (no key required); falls back
to a deterministic stub if the API is unavailable so the marketplace never
stalls.
"""

from __future__ import annotations

from typing import Any

import httpx

from logos.server import ReasoningTrace, Specialist, run

DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens"

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


def _map_dexscreener(data: dict[str, Any], addr: str) -> dict[str, Any]:
    """Map a Dexscreener token response to our schema, picking the pair with
    the deepest liquidity."""
    pairs = data.get("pairs") or []
    if not pairs:
        raise ValueError("no pairs for token")
    top = max(pairs, key=lambda p: float((p.get("liquidity") or {}).get("usd") or 0.0))
    return {
        "pair_address": top.get("pairAddress") or addr,
        "volume_24h_usdc": float((top.get("volume") or {}).get("h24") or 0.0),
        "liquidity_depth_usdc": float((top.get("liquidity") or {}).get("usd") or 0.0),
    }


async def _fetch_dex(addr: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=6.0) as http:
        resp = await http.get(f"{DEXSCREENER}/{addr}")
        resp.raise_for_status()
        return _map_dexscreener(resp.json(), addr)


class OnchainDexData(Specialist):
    name = "onchain_dex_data"
    service_type = "dex_telemetry"
    price_per_query_usdc_6 = 250  # $0.000250
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        addr = str(payload.get("pair_address") or payload.get("token_address") or "")
        trace.step(f"Resolving DEX telemetry for {addr or '<unspecified>'}")
        if addr:
            try:
                result = await _fetch_dex(addr)
                trace.step(
                    f"Dexscreener · 24h volume ${result['volume_24h_usdc']:,.0f} · "
                    f"liquidity ${result['liquidity_depth_usdc']:,.0f}"
                )
                return result
            except Exception as e:
                trace.step(f"Dexscreener unavailable ({e}); falling back to stub")
        result = _telemetry(addr)
        trace.step(
            f"Stub · 24h volume ${result['volume_24h_usdc']:,.0f} · "
            f"liquidity ${result['liquidity_depth_usdc']:,.0f}"
        )
        return result


SPECIALIST = OnchainDexData()


if __name__ == "__main__":
    run(SPECIALIST, port=7408)
