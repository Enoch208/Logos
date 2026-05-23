"""Live proof of FR-3: one real-settlement query against a running specialist.

Asserts the specialist payout's USDC balanceOf increased by the price. Requires
the fleet running with SETTLEMENT_MODE=real and ATLAS_PRIVATE_KEY funded. Run
from agents/ with .env sourced:

    SETTLEMENT_MODE=real ./.venv/bin/python scripts/settlement_smoke_test.py \
        --endpoint http://localhost:8080/specialists/kelly_sizer
"""
from __future__ import annotations

import argparse
import asyncio
import os

from logos.client import LogosClient
from logos.contracts import ChainBridge, ChainConfig


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", required=True)
    ap.add_argument("--service-type", default="capital_allocation")
    args = ap.parse_args()

    os.environ["SETTLEMENT_MODE"] = "real"
    cfg = ChainConfig.from_env()
    assert cfg, (
        "chain env not set "
        "(ARC_RPC_URL/ARC_CHAIN_ID/MARKETPLACE_ADDRESS/AGENT_REGISTRY_ADDRESS)"
    )
    atlas = ChainBridge(cfg, private_key=os.environ["ATLAS_PRIVATE_KEY"])
    payee = os.environ["SPECIALIST_PAYOUT_ADDRESS"]

    before = atlas.usdc_balance_of(payee)
    client = LogosClient(
        specialist_directory={args.service_type: args.endpoint},
        chain_bridge=atlas,
        chain_id=cfg.chain_id,
        auto_rate=5,
    )
    resp = await client.query(
        service_type=args.service_type,
        payload={"edge_percentage": 3, "odds_fraction": 1},
    )
    after = atlas.usdc_balance_of(payee)

    print(f"settlement_tx : {getattr(resp, 'settlement_tx', None)}")
    print(f"payee balance : {before} -> {after} (+{after - before})")
    print(f"query_id      : {resp.query_id}")
    assert after > before, (
        "payee USDC balance did not increase — settlement did not move funds"
    )
    print("PASS: real USDC moved trader -> specialist")


if __name__ == "__main__":
    asyncio.run(main())
