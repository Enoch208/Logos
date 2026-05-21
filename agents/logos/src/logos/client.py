"""Trader-side client.

Usage (off-chain only):

    client = LogosClient(
        specialist_directory={
            "translation": "http://localhost:7401",
            "market_sentiment": "http://localhost:7402",
        },
    )
    response = await client.query(service_type="translation", payload={...})

Usage (with on-chain anchoring of recordQuery + rate):

    from logos.contracts import ChainBridge, ChainConfig

    cfg = ChainConfig.from_env()
    bridge = ChainBridge(cfg, private_key=os.environ["TRADER_PRIVATE_KEY"])

    client = LogosClient(
        specialist_directory={...},
        chain_bridge=bridge,
        auto_rate=5,  # rates every successful query 5/5
    )

When `chain_bridge` is set, `query()` calls `recordQuery` before the paid
POST (so the on-chain queryId is the one the specialist signs over) and
optionally `rate(queryId, score)` after success — making the full
Escrowed → Attested → Rated sweep visible to the indexer.
"""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from typing import Any

import httpx

from .canonical import keccak_hex
from .contracts import ChainBridge
from .signing import verify_attestation
from .types import AttestedResponse
from .x402 import extract_payment_header  # noqa: F401 — kept for backwards-compat re-export


class QueryFailed(Exception):
    pass


@dataclass
class LogosClient:
    specialist_directory: dict[str, str]
    wallet_private_key: str | None = None
    chain_id: int | None = None
    marketplace_address: str | None = None
    timeout: float = 30.0
    chain_bridge: ChainBridge | None = None
    auto_rate: int | None = None  # 1–5, or None to skip rating

    def __post_init__(self) -> None:
        self.chain_id = self.chain_id or int(os.environ.get("ARC_CHAIN_ID", "0"))
        self.marketplace_address = self.marketplace_address or os.environ.get(
            "MARKETPLACE_ADDRESS", "0x" + "0" * 40
        )

    async def query(
        self,
        *,
        service_type: str,
        payload: dict[str, Any],
        max_price_usdc: float | None = None,
        verify_signer: str | None = None,
        rating: int | None = None,
    ) -> AttestedResponse:
        endpoint = self.specialist_directory.get(service_type)
        if not endpoint:
            raise QueryFailed(f"no specialist registered for service_type={service_type!r}")

        async with httpx.AsyncClient(timeout=self.timeout) as http:
            # Round 1 — expect HTTP 402 with payment instructions
            probe = await http.post(f"{endpoint}/run", json=payload)
            if probe.status_code != 402:
                raise QueryFailed(
                    f"expected 402, got {probe.status_code}: {probe.text[:200]}"
                )

            price = int(probe.headers.get("x-402-price", "0"))
            if max_price_usdc is not None and price > int(max_price_usdc * 1_000_000):
                raise QueryFailed(
                    f"specialist price {price} > max_price_usdc {max_price_usdc}"
                )

            payment_auth = self._make_payment_auth(
                price=price,
                recipient=probe.headers.get("x-402-recipient", ""),
                query_id=probe.headers.get("x-402-query-id", ""),
            )

            # On-chain: pre-record the query so the specialist signs over
            # the same queryId the contract will check at rate() time.
            query_id = probe.headers.get("x-402-query-id", "")
            if self.chain_bridge is not None:
                offer_id = await self._discover_offer_id(http, endpoint)
                if offer_id:
                    payload_hash = keccak_hex(payload)
                    _tx, query_id = self.chain_bridge.record_query(
                        offer_id=offer_id,
                        query_payload_hash=payload_hash,
                        payment_auth_hash=keccak_hex({"auth": payment_auth}),
                    )

            # Round 2 — paid request with the (possibly on-chain) queryId
            paid = await http.post(
                f"{endpoint}/run",
                json=payload,
                headers={
                    "X-Payment-Auth": payment_auth,
                    "X-402-Query-Id": query_id,
                },
            )
            if paid.status_code != 200:
                raise QueryFailed(
                    f"specialist returned {paid.status_code}: {paid.text[:200]}"
                )

            body = paid.json()
            response = AttestedResponse(
                query_id=body["query_id"],
                payload=body["payload"],
                trace_cid=body["trace_cid"],
                signature=body["signature"],
                specialist_address=body.get("specialist_address", ""),
            )

            if verify_signer:
                ok = verify_attestation(
                    signature=response.signature,
                    expected_signer=verify_signer,
                    chain_id=self.chain_id or 0,
                    marketplace_address=self.marketplace_address or "0x" + "0" * 40,
                    query_id=response.query_id,
                    response_hash=body["response_hash"],
                    trace_cid=body["trace_anchor"],
                )
                if not ok:
                    raise QueryFailed("attestation signature does not match expected signer")

            score = rating if rating is not None else self.auto_rate
            if score is not None and self.chain_bridge is not None:
                try:
                    self.chain_bridge.rate(response.query_id, score)
                except Exception as e:
                    # Rating failure shouldn't lose the response itself; log
                    # and move on. A future revision can surface this.
                    print(f"[client] on-chain rate failed: {e}")

            return response

    async def _discover_offer_id(self, http: httpx.AsyncClient, endpoint: str) -> str | None:
        try:
            resp = await http.get(f"{endpoint}/health", timeout=3.0)
            resp.raise_for_status()
            return resp.json().get("offer_id")
        except Exception:
            return None

    def _make_payment_auth(self, *, price: int, recipient: str, query_id: str) -> str:
        # Opaque token the specialist echoes back. The real x402 / Circle
        # Gateway path replaces this with an EIP-3009 authorization signed
        # over (USDC, recipient, price, nonce). We anchor its keccak on
        # chain so reputation accountability still works.
        nonce = "0x" + secrets.token_hex(16)
        return keccak_hex(
            {
                "v": 1,
                "price": price,
                "recipient": recipient,
                "query_id": query_id,
                "nonce": nonce,
            }
        )
