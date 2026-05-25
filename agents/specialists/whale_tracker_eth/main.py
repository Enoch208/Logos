"""whale_tracker_eth — large-transfer activity for a token over a recent
window, plus active whale-wallet count.

Backed by the Etherscan API (set `ETHERSCAN_API_KEY`): pulls recent token
transfers, keeps the top-quartile (whale) transfers in a 30-minute window, and
aggregates volume + distinct wallets. Falls back to a deterministic stub when
the key isn't set or the API is unavailable.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

from logos.server import ReasoningTrace, Specialist, run

ETHERSCAN = "https://api.etherscan.io/v2/api"

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
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
        "net_flow_30m": "+12,450,000 USDC",
        "active_whale_wallets": 18,
        "top_outflow_wallet": "0x6262...d4a1",
    },
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


def _map_whales(transfers: list[dict[str, Any]], now_ts: int, window_s: int = 1800) -> dict[str, Any]:
    """Top-quartile (whale) transfers within the window → volume + wallets."""
    rows: list[tuple[float, str, str]] = []
    symbol = "TOKEN"
    for t in transfers:
        try:
            ts = int(t.get("timeStamp", 0))
            if ts < now_ts - window_s:
                continue
            dec = int(t.get("tokenDecimal") or 18)
            val = int(t.get("value", 0)) / (10**dec)
        except (TypeError, ValueError):
            continue
        symbol = t.get("tokenSymbol") or symbol
        rows.append((val, str(t.get("from", "")).lower(), str(t.get("to", "")).lower()))
    if not rows:
        raise ValueError("no transfers in window")

    values = sorted(v for v, _, _ in rows)
    threshold = values[int(len(values) * 0.75)] if len(values) >= 4 else values[0]
    whales = [(v, f, to) for v, f, to in rows if v >= threshold]

    wallets: set[str] = set()
    outflow: dict[str, float] = {}
    total = 0.0
    for v, frm, to in whales:
        wallets.add(frm)
        wallets.add(to)
        outflow[frm] = outflow.get(frm, 0.0) + v
        total += v
    top = max(outflow, key=lambda k: outflow[k]) if outflow else ""
    return {
        "net_flow_30m": f"{total:,.0f} {symbol} moved by {len(whales)} whale transfers (30m)",
        "active_whale_wallets": len(wallets),
        "top_outflow_wallet": (top[:6] + "…" + top[-4:]) if len(top) >= 12 else top,
    }


async def _fetch_whales(token: str, api_key: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.get(
            ETHERSCAN,
            params={
                "chainid": 1,
                "module": "account",
                "action": "tokentx",
                "contractaddress": token,
                "page": 1,
                "offset": 100,
                "sort": "desc",
                "apikey": api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if str(data.get("status")) != "1":
            raise ValueError(str(data.get("message") or "etherscan error"))
        out = _map_whales(data.get("result") or [], int(time.time()))
        out["token_address"] = token
        return out


class WhaleTrackerEth(Specialist):
    name = "whale_tracker_eth"
    service_type = "whale_tracking"
    price_per_query_usdc_6 = 300  # $0.000300
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        addr = str(payload.get("token_address", "")).strip()
        api_key = os.environ.get("ETHERSCAN_API_KEY")
        trace.step(f"Scanning ETH mainnet 30m window for token={addr or '<unspecified>'}")
        if addr and api_key:
            try:
                result = await _fetch_whales(addr, api_key)
                trace.step(
                    f"Etherscan · {result['active_whale_wallets']} whale wallets · "
                    f"{result['net_flow_30m']}"
                )
                return result
            except Exception as e:
                trace.step(f"Etherscan unavailable ({e}); falling back to stub")
        elif addr and not api_key:
            trace.step("ETHERSCAN_API_KEY not set; using stub")
        result = _track(addr)
        trace.step(
            f"Identified {result['active_whale_wallets']} whale wallets; "
            f"net flow {result['net_flow_30m']}"
        )
        return result


SPECIALIST = WhaleTrackerEth()


if __name__ == "__main__":
    run(SPECIALIST, port=7404)
