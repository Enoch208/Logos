"""Canonical JSON serialization.

The on-chain `responseHash` and `traceCID` anchors are computed against the
canonical form of the response payload + reasoning trace, not whatever
formatting the specialist happens to emit. This module defines the one true
serialization both sides agree on:

- keys sorted
- no extra whitespace
- UTF-8 with non-ASCII chars escaped to \\uXXXX so the byte stream is
  invariant across Python / JavaScript / Solidity-side keccak inputs.
"""

from __future__ import annotations

import json
from hashlib import sha256
from typing import Any


def canonical_dumps(value: Any) -> str:
    """Stable string representation suitable for hashing across languages."""
    return json.dumps(
        value,
        sort_keys=True,
        ensure_ascii=True,
        separators=(",", ":"),
    )


def canonical_bytes(value: Any) -> bytes:
    return canonical_dumps(value).encode("utf-8")


def sha256_hex(value: Any) -> str:
    return "0x" + sha256(canonical_bytes(value)).hexdigest()


def keccak_hex(value: Any) -> str:
    """Keccak256 of the canonical JSON. Imported lazily so callers that
    only need sha256 don't pay for eth-hash."""
    from eth_utils import keccak  # noqa: PLC0415

    return "0x" + keccak(canonical_bytes(value)).hex()
