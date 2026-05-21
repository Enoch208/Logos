"""Trader-side client.

Usage:

    client = LogosClient(
        specialist_directory={
            "translation": "http://localhost:7401",
            "market_sentiment": "http://localhost:7402",
        },
        wallet_private_key=os.environ["TRADER_PRIVATE_KEY"],
    )

    response = await client.query(
        service_type="translation",
        payload={"text_url": "https://pbc.gov.cn/..."},
        max_price_usdc=0.001,
    )
    print(response.payload, response.trace_cid)

This v1 client takes an explicit `specialist_directory` mapping. A future
revision can resolve via the indexer (`GET /api/specialists`) or directly
from the Marketplace contract.
"""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from typing import Any

import httpx

from .canonical import keccak_hex
from .signing import verify_attestation
from .types import AttestedResponse
from .x402 import extract_payment_header


class QueryFailed(Exception):
    pass


@dataclass
class LogosClient:
    specialist_directory: dict[str, str]
    wallet_private_key: str | None = None
    chain_id: int | None = None
    marketplace_address: str | None = None
    timeout: float = 30.0

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

            # Round 2 — payment "authorization". v1: a synthesized opaque
            # token + its hash anchored on-chain via Marketplace.recordQuery.
            # A future revision swaps this for a real EIP-3009 signature.
            payment_auth = self._make_payment_auth(
                price=price,
                recipient=probe.headers.get("x-402-recipient", ""),
                query_id=probe.headers.get("x-402-query-id", ""),
            )
            paid = await http.post(
                f"{endpoint}/run",
                json=payload,
                headers={
                    "X-Payment-Auth": payment_auth,
                    "X-402-Query-Id": probe.headers.get("x-402-query-id", ""),
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

            return response

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
