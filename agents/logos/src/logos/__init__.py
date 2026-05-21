"""Logos marketplace SDK.

Two public surfaces:

- LogosClient — trader-side, calls `client.query(service_type, payload)` and
  pays via x402 / EIP-3009.
- specialist.Server — specialist-side, decorates a `handler` callable and
  exposes it as an x402-protected HTTP endpoint.

Shared primitives (signing, schemas, IPFS) live in the submodules and can
be used independently.
"""

from .client import LogosClient
from .schemas import validate_response
from .signing import (
    attestation_digest,
    sign_attestation,
    verify_attestation,
)
from .types import (
    AttestedResponse,
    Offer,
    Query,
    QueryStatus,
    SpecialistDescriptor,
)

__all__ = [
    "LogosClient",
    "AttestedResponse",
    "Offer",
    "Query",
    "QueryStatus",
    "SpecialistDescriptor",
    "attestation_digest",
    "sign_attestation",
    "verify_attestation",
    "validate_response",
]

__version__ = "0.1.0"
