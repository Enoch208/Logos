"""Data shapes shared between trader and specialist."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any


class QueryStatus(str, Enum):
    ESCROWED = "ESCROWED"
    ATTESTED = "ATTESTED"
    RATED = "RATED"
    EXPIRED = "EXPIRED"


@dataclass(frozen=True)
class SpecialistDescriptor:
    """A specialist's published identity, mirrored from the AgentRegistry."""

    agent_id: str  # bytes32 hex
    name: str
    service_type: str
    price_per_query_usdc: float
    endpoint_url: str
    schema: dict[str, Any]


@dataclass(frozen=True)
class Offer:
    """A specialist's posted offer, mirrored from Marketplace.Offer."""

    offer_id: str
    agent_id: str
    service_type_hash: str
    schema_hash: str
    price_per_query: int  # USDC 6-decimal
    endpoint_url: str
    active: bool


@dataclass(frozen=True)
class Query:
    """A trader's submitted query record."""

    query_id: str
    offer_id: str
    trader: str
    payment_auth_hash: str
    query_payload_hash: str
    response_hash: str
    trace_cid: str
    rating: int
    created_at: int
    status: QueryStatus


@dataclass(frozen=True)
class AttestedResponse:
    """A specialist's signed response delivered to the trader."""

    query_id: str
    payload: dict[str, Any]
    trace_cid: str
    signature: str  # 0x-prefixed hex
    specialist_address: str
