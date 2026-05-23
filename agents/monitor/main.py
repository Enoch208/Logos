"""Standalone health-monitor runner (FR-10) — opt-in.

Probes every specialist's /health on an interval; after N consecutive
failures it deactivates that specialist's offer on-chain so it drops out
of discovery. Deliberately separate from the serving fleet so it never
deactivates anything during normal operation unless a specialist is
genuinely down.

    pm2 start agents/monitor/main.py --name logos-monitor --interpreter ./.venv/bin/python
    # or
    HEALTH_THRESHOLD=3 HEALTH_INTERVAL=30 ./.venv/bin/python monitor/main.py

Knobs (env or agents/.env):
    FLEET_BASE        where specialists live (default http://localhost:8080)
    HEALTH_THRESHOLD  consecutive failures before deactivation (default 3)
    HEALTH_INTERVAL   seconds between probe sweeps (default 30)
"""

from __future__ import annotations

import asyncio
import os

from logos.canonical import keccak_text
from logos.contracts import ChainBridge, ChainConfig
from logos.health import run_monitor
from logos.server import _load_offer_cache, _offer_is_active

SPECIALISTS = [
    "mandarin_macro",
    "twitter_sentiment",
    "polymarket_structurer",
    "whale_tracker_eth",
    "risk_checker",
    "news_summarizer",
    "kelly_sizer",
    "onchain_dex_data",
]


async def _main() -> None:
    base = os.environ.get("FLEET_BASE", "http://localhost:8080")
    threshold = int(os.environ.get("HEALTH_THRESHOLD", "3"))
    interval = float(os.environ.get("HEALTH_INTERVAL", "30"))

    specialists = {name: f"{base}/specialists/{name}" for name in SPECIALISTS}

    bridge = None
    offer_ids: dict[str, str] = {}
    cfg = ChainConfig.from_env()
    pk = os.environ.get("SPECIALIST_PRIVATE_KEY")
    if cfg and pk:
        bridge = ChainBridge(cfg, private_key=pk)
        # Resolve each specialist's active offer from the fleet's cache so we
        # can deactivate it on-chain if it goes dark.
        cache = _load_offer_cache()  # agent_id -> offer_id
        for name in SPECIALISTS:
            oid = cache.get(keccak_text(f"logos-agent:{name}"))
            if oid and _offer_is_active(bridge, oid):
                offer_ids[name] = oid
        print(f"[monitor] chain mode · resolved {len(offer_ids)} offer ids", flush=True)
    else:
        print("[monitor] off-chain mode · will track + log only (no deactivation)", flush=True)

    await run_monitor(
        specialists=specialists,
        offer_ids=offer_ids,
        bridge=bridge,
        threshold=threshold,
        interval_s=interval,
    )


if __name__ == "__main__":
    asyncio.run(_main())
