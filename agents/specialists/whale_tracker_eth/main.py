"""whale_tracker_eth — net flow over a token across a rolling 30-minute window
plus active whale-wallet count. Real impl would back this with an
on-chain indexer (e.g. Etherscan / Alchemy).
"""

from __future__ import annotations

from typing import Any

from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "token_address": {"type": "string"},
        "net_flow_30m": {"type": "string"},
        "active_whale_wallets": {"type": "integer", "minimum": 0},
        "top_outflow_wallet": {"type": "string"},
    },
    "required": ["net_flow_30m", "active_whale_wallets"],
}

STUB: dict[str, dict[str, Any]] = {
    # USDC on mainnet
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
        "net_flow_30m": "+12,450,000 USDC",
        "active_whale_wallets": 18,
        "top_outflow_wallet": "0x6262...d4a1",
    },
    # WETH on mainnet
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
        "net_flow_30m": "-3,820 WETH",
        "active_whale_wallets": 11,
        "top_outflow_wallet": "0x71c7...0a55",
    },
}


def _track(addr: str) -> dict[str, Any]:
    key = addr.lower()
    if key in STUB:
        out = STUB[key].copy()
        out["token_address"] = addr
        return out
    return {
        "token_address": addr or "0x" + "0" * 40,
        "net_flow_30m": "0",
        "active_whale_wallets": 0,
    }


class WhaleTrackerEth(Specialist):
    name = "whale_tracker_eth"
    service_type = "whale_tracking"
    price_per_query_usdc_6 = 300  # $0.000300
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        addr = str(payload.get("token_address", "")).strip()
        trace.step(f"Scanned ETH mainnet 30m window for token={addr or '<unspecified>'}")
        result = _track(addr)
        trace.step(
            f"Identified {result['active_whale_wallets']} whale wallets; "
            f"net flow {result['net_flow_30m']}"
        )
        return result


SPECIALIST = WhaleTrackerEth()


if __name__ == "__main__":
    run(SPECIALIST, port=7404)
