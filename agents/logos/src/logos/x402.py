"""x402 — HTTP 402 Payment Required envelope used between trader and specialist.

The spec we follow:

- Specialist endpoint returns 402 on unauthenticated requests with headers:
    X-402-Price:        per-query price in USDC 6-decimal as decimal string
    X-402-Recipient:    specialist payout address
    X-402-Query-Id:     a server-issued nonce the trader must echo
    X-402-Chain-Id:     chain on which the EIP-3009 authorization is valid

- Trader resubmits with:
    X-Payment-Auth: 0x...  (signed EIP-3009 authorization OR Circle Gateway
                            payment token; this module is agnostic — it just
                            verifies presence + records the keccak hash on
                            chain via Marketplace.recordQuery)

A future revision can plug in real EIP-3009 verification + Circle Gateway
settlement; v1 trusts the trader's signature and lets Marketplace.rate
serve as the after-the-fact accountability point.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentRequired:
    price_usdc_6: int
    recipient: str
    query_id: str
    chain_id: int

    def to_headers(self) -> dict[str, str]:
        return {
            "X-402-Price": str(self.price_usdc_6),
            "X-402-Recipient": self.recipient,
            "X-402-Query-Id": self.query_id,
            "X-402-Chain-Id": str(self.chain_id),
        }


def extract_payment_header(headers: dict[str, str]) -> str | None:
    """Returns the X-Payment-Auth value if present, normalised to lower-case
    0x-prefixed hex."""
    for k, v in headers.items():
        if k.lower() == "x-payment-auth":
            return v.lower() if v.startswith("0x") else f"0x{v.lower()}"
    return None
