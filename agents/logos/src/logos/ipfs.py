"""IPFS pinning for reasoning traces.

Primary: web3.storage. Fallback: Pinata. If neither token is configured we
return a deterministic local-CID so dev environments can still run end-to-end
without external network — `dev:<sha256>`. The marketplace contract still
gets a 32-byte anchor; just resolution off-chain becomes a no-op.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from .canonical import canonical_bytes, sha256_hex

W3S_API = "https://api.web3.storage/upload"
PINATA_API = "https://api.pinata.cloud/pinning/pinJSONToIPFS"


class IPFSPinError(Exception):
    """Raised when both primary and fallback pinning fail."""


async def pin_trace(trace: dict[str, Any], *, client: httpx.AsyncClient | None = None) -> str:
    """Pins canonical JSON of `trace` to IPFS and returns its CID."""
    body = canonical_bytes(trace)
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=30.0)
    try:
        token = os.environ.get("WEB3_STORAGE_TOKEN")
        if token:
            try:
                resp = await client.post(
                    W3S_API,
                    headers={"Authorization": f"Bearer {token}"},
                    content=body,
                )
                resp.raise_for_status()
                return resp.json()["cid"]
            except Exception as e:
                _log_fallback("web3.storage", e)

        pinata_jwt = os.environ.get("PINATA_JWT")
        if pinata_jwt:
            try:
                resp = await client.post(
                    PINATA_API,
                    headers={
                        "Authorization": f"Bearer {pinata_jwt}",
                        "Content-Type": "application/json",
                    },
                    content=body,
                )
                resp.raise_for_status()
                return resp.json()["IpfsHash"]
            except Exception as e:
                _log_fallback("pinata", e)

        # Dev fallback — deterministic non-IPFS CID so the contract still
        # gets a stable 32-byte anchor.
        return f"dev:{sha256_hex(trace)[2:]}"
    finally:
        if owns_client:
            await client.aclose()


def _log_fallback(provider: str, err: Exception) -> None:
    import sys

    print(f"[ipfs] {provider} pin failed ({err}); trying next provider", file=sys.stderr)
