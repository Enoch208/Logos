"""Logos fleet — one FastAPI app hosting all 8 specialists.

For local dev each specialist runs on its own port via
`scripts/boot_all.sh`. That's fine for laptops but doesn't fit a single
hosting slot. This module mounts every specialist as a sub-app under
`/specialists/<name>`, with a single process / single port / single
deployer key, and serializes the on-chain registration so 8 concurrent
lifespans don't race the deployer nonce.

Trader directory becomes:
    translation              -> <fleet>/specialists/mandarin_macro
    market_sentiment         -> <fleet>/specialists/twitter_sentiment
    polymarket_structuring   -> <fleet>/specialists/polymarket_structurer
    whale_tracking           -> <fleet>/specialists/whale_tracker_eth
    risk_evaluation          -> <fleet>/specialists/risk_checker
    news_summarization       -> <fleet>/specialists/news_summarizer
    capital_allocation       -> <fleet>/specialists/kelly_sizer
    dex_telemetry            -> <fleet>/specialists/onchain_dex_data

Boot:
    PORT=8080 python -m fleet.main
"""

from __future__ import annotations

import asyncio
import os
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Importing each specialist module pulls in its `SPECIALIST` instance,
# which is what FleetRunner mounts.
from specialists.kelly_sizer.main import SPECIALIST as kelly_sizer
from specialists.mandarin_macro.main import SPECIALIST as mandarin_macro
from specialists.news_summarizer.main import SPECIALIST as news_summarizer
from specialists.onchain_dex_data.main import SPECIALIST as onchain_dex_data
from specialists.polymarket_structurer.main import SPECIALIST as polymarket_structurer
from specialists.risk_checker.main import SPECIALIST as risk_checker
from specialists.twitter_sentiment.main import SPECIALIST as twitter_sentiment
from specialists.whale_tracker_eth.main import SPECIALIST as whale_tracker_eth

from logos.contracts import ChainBridge, ChainConfig
from logos.server import (
    _ensure_offer,
    build_app,
    register_in_fleet,
)

ALL_SPECIALISTS = [
    mandarin_macro,
    twitter_sentiment,
    polymarket_structurer,
    whale_tracker_eth,
    risk_checker,
    news_summarizer,
    kelly_sizer,
    onchain_dex_data,
]


# Warm-up state. The anchoring loop runs in the background so the server
# accepts connections in ~1s instead of blocking ~40s on 8 sequential
# on-chain registrations. /healthz reports 503 until `ready` flips.
_warmup: dict[str, Any] = {"ready": False, "anchored": 0, "total": 0, "detail": "starting"}


async def _anchor_fleet() -> None:
    cfg = ChainConfig.from_env()
    if not cfg:
        print("[fleet] no ChainConfig in env; running off-chain", flush=True)
        _warmup.update(ready=True, detail="off-chain (no chain config)")
        return
    try:
        bridge = ChainBridge(cfg, private_key=_required_env("SPECIALIST_PRIVATE_KEY"))
        base = os.environ.get("FLEET_PUBLIC_URL", "http://localhost:8080")
        _warmup["total"] = len(ALL_SPECIALISTS)
        for spec in ALL_SPECIALISTS:
            endpoint = f"{base}/specialists/{spec.name}"
            offer_id = await _ensure_offer(bridge, spec, endpoint)
            register_in_fleet(spec.name, bridge, offer_id)
            _warmup["anchored"] += 1
            _warmup["detail"] = f"anchoring {_warmup['anchored']}/{_warmup['total']}"
            print(
                f"[fleet] {spec.name:<24} anchored · offer_id={offer_id[:14]}… "
                f"({_warmup['anchored']}/{_warmup['total']})",
                flush=True,
            )
        print(f"[fleet] all {len(ALL_SPECIALISTS)} specialists anchored on-chain", flush=True)
        _warmup.update(ready=True, detail="ready")
    except Exception as e:
        print(f"[fleet] on-chain anchor disabled ({e}); running off-chain only", flush=True)
        _warmup.update(ready=True, detail=f"off-chain ({e})")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    from logos.llm import is_configured as _llm_configured

    if _llm_configured():
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        print(f"[fleet] LLM: enabled (model={model})", flush=True)
    else:
        print("[fleet] LLM: disabled (OPENAI_API_KEY not set) — using stubs", flush=True)

    # Don't block the port on the ~40s anchoring; run it in the background.
    task = asyncio.create_task(_anchor_fleet())
    yield
    task.cancel()


def _required_env(var: str) -> str:
    v = os.environ.get(var)
    if not v:
        raise RuntimeError(f"missing required env var: {var}")
    return v


app = FastAPI(title="logos-fleet", lifespan=lifespan)


@app.get("/")
async def root() -> dict[str, Any]:
    return {
        "service": "logos-fleet",
        "ready": _warmup["ready"],
        "warmup": _warmup["detail"],
        "specialists": [
            {
                "name": s.name,
                "service_type": s.service_type,
                "price_per_query_usdc_6": s.price_per_query_usdc_6,
                "path": f"/specialists/{s.name}",
            }
            for s in ALL_SPECIALISTS
        ],
    }


@app.get("/healthz")
async def healthz() -> JSONResponse:
    # 503 while the background anchoring is still running so a poke during
    # the boot window reads as "warming up" rather than a dropped connection.
    if not _warmup["ready"]:
        return JSONResponse(
            {"status": "warming_up", "detail": _warmup["detail"]},
            status_code=503,
        )
    return JSONResponse({"status": "ok", "detail": _warmup["detail"]})


# Mount each specialist as an independent ASGI sub-app. Their own /health,
# /schema, /run routes resolve under /specialists/<name>/...
for _spec in ALL_SPECIALISTS:
    app.mount(f"/specialists/{_spec.name}", build_app(_spec))


def main() -> None:
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
