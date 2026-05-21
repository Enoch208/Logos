"""Specialist runner.

Subclass `Specialist` and implement `handle(query) -> dict`. The framework
wraps it as a FastAPI app with the x402 payment-required dance, signs the
attestation, pins the trace, and (if a ChainBridge is configured) anchors
the attestation on-chain via Marketplace.attestResponse.

Example
-------

    from logos.server import Specialist, run

    class MandarinMacro(Specialist):
        name = "mandarin_macro"
        service_type = "translation"
        price_per_query_usdc_6 = 150  # = $0.000150
        response_schema = {"type": "object", ...}

        async def handle(self, payload, *, trace):
            trace.step("Parsed PBoC frame")
            return {"translated_text": "...", "confidence_score": 0.99}

    if __name__ == "__main__":
        run(MandarinMacro())
"""

from __future__ import annotations

import os
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from .canonical import canonical_dumps, keccak_hex, keccak_text
from .contracts import ChainBridge, ChainConfig, _hex0x, _to_bytes32
from .ipfs import pin_trace
from .schemas import validate_response
from .signing import sign_attestation
from .x402 import PaymentRequired, extract_payment_header


@dataclass
class ReasoningTrace:
    steps: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def step(self, line: str) -> None:
        self.steps.append(line)

    def to_dict(self) -> dict[str, Any]:
        return {"steps": self.steps, "metadata": self.metadata}


class Specialist:
    """Base class — subclass and implement `handle`."""

    name: str = "specialist"
    service_type: str = "generic"
    price_per_query_usdc_6: int = 100  # USDC 6-decimal
    response_schema: dict[str, Any] = {}

    async def handle(self, payload: dict[str, Any], *, trace: ReasoningTrace) -> dict[str, Any]:
        raise NotImplementedError

    @property
    def agent_id(self) -> str:
        """Deterministic bytes32 agent id derived from the specialist's name."""
        return keccak_text(f"logos-agent:{self.name}")

    @property
    def service_type_hash(self) -> str:
        return keccak_text(self.service_type)

    @property
    def schema_hash(self) -> str:
        return keccak_hex(self.response_schema)


def _required_env(var: str) -> str:
    v = os.environ.get(var)
    if not v:
        raise RuntimeError(f"missing required env var: {var}")
    return v


@dataclass
class ServerState:
    bridge: ChainBridge | None = None
    offer_id: str | None = None


# Fleet mode: when multiple specialists run in a single process (one
# FastAPI app per specialist, all mounted under one parent), the parent
# does on-chain registration sequentially BEFORE the children's lifespans
# fire. It populates this dict; each child's lifespan reads its own entry
# and skips the per-specialist init that would otherwise race the deployer
# nonce.
FLEET_REGISTRY: dict[str, tuple[ChainBridge, str]] = {}


def register_in_fleet(name: str, bridge: ChainBridge, offer_id: str) -> None:
    FLEET_REGISTRY[name] = (bridge, offer_id)


def build_app(specialist: Specialist) -> FastAPI:
    state = ServerState()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        # Fleet mode: bridge + offer already provisioned by the parent.
        fleet_entry = FLEET_REGISTRY.get(specialist.name)
        if fleet_entry is not None:
            state.bridge, state.offer_id = fleet_entry
            print(
                f"[server] {specialist.name} bound to fleet · "
                f"offer_id={state.offer_id[:14]}…"
            )
            yield
            return

        cfg = ChainConfig.from_env()
        if cfg:
            try:
                state.bridge = ChainBridge(
                    cfg, private_key=_required_env("SPECIALIST_PRIVATE_KEY")
                )
                endpoint = os.environ.get("SPECIALIST_ENDPOINT_URL", "")
                state.offer_id = await _ensure_offer(state.bridge, specialist, endpoint)
                print(
                    f"[server] {specialist.name} anchored on-chain · "
                    f"offer_id={state.offer_id[:14]}…"
                )
            except Exception as e:
                print(f"[server] on-chain anchor disabled ({e}); running off-chain only")
                state.bridge = None
                state.offer_id = None
        yield

    app = FastAPI(title=f"logos-specialist:{specialist.name}", lifespan=lifespan)

    def _live_state() -> tuple[ChainBridge | None, str | None]:
        """Read the freshest bridge + offer_id from either local state or
        the FLEET_REGISTRY. Fleet mode populates the registry from the
        parent lifespan, which may finish AFTER this child's lifespan has
        already passed its own check — so we re-resolve at request time."""
        fleet_entry = FLEET_REGISTRY.get(specialist.name)
        if fleet_entry is not None:
            return fleet_entry
        return state.bridge, state.offer_id

    @app.get("/health")
    async def health() -> dict[str, Any]:
        bridge, offer_id = _live_state()
        return {
            "ok": True,
            "specialist": specialist.name,
            "service_type": specialist.service_type,
            "price_per_query_usdc_6": specialist.price_per_query_usdc_6,
            "agent_id": specialist.agent_id,
            "offer_id": offer_id,
            "on_chain": bridge is not None,
        }

    @app.get("/schema")
    async def schema() -> dict[str, Any]:
        return specialist.response_schema

    @app.post("/run")
    async def run(request: Request) -> Response:
        chain_id = int(os.environ.get("ARC_CHAIN_ID", "0"))
        marketplace = os.environ.get("MARKETPLACE_ADDRESS", "0x" + "0" * 40)
        recipient = os.environ.get("SPECIALIST_PAYOUT_ADDRESS", "0x" + "0" * 40)
        private_key = _required_env("SPECIALIST_PRIVATE_KEY")

        payload = await request.json()
        headers = {k: v for k, v in request.headers.items()}
        payment = extract_payment_header(headers)

        if not payment:
            required = PaymentRequired(
                price_usdc_6=specialist.price_per_query_usdc_6,
                recipient=recipient,
                query_id="0x" + secrets.token_hex(32),
                chain_id=chain_id,
            )
            return Response(
                status_code=402,
                content=canonical_dumps(
                    {"reason": "Payment required (x402)", "x402": required.to_headers()}
                ),
                media_type="application/json",
                headers=required.to_headers(),
            )

        query_id = headers.get("x-402-query-id") or "0x" + secrets.token_hex(32)
        trace = ReasoningTrace(metadata={"specialist": specialist.name, "query_id": query_id})

        try:
            result = await specialist.handle(payload, trace=trace)
            if specialist.response_schema:
                validate_response(result, specialist.response_schema)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"handler failed: {e}") from e

        trace_doc = {"response": result, "reasoning": trace.to_dict()}
        cid = await pin_trace(trace_doc)
        trace_anchor = keccak_hex(trace_doc)
        response_hash = keccak_hex(result)

        signature = sign_attestation(
            private_key=private_key,
            chain_id=chain_id,
            marketplace_address=marketplace,
            query_id=query_id,
            response_hash=response_hash,
            trace_cid=trace_anchor,
        )

        bridge_now, _offer_now = _live_state()
        attest_tx = None
        if bridge_now is not None:
            try:
                attest_tx = bridge_now.attest_response(
                    query_id=query_id,
                    response_hash=response_hash,
                    trace_cid=trace_anchor,
                    signature=signature,
                )
            except Exception as e:
                print(f"[server] attestResponse failed ({e}); response served off-chain")

        return JSONResponse(
            {
                "query_id": query_id,
                "payload": result,
                "trace_cid": cid,
                "trace_anchor": trace_anchor,
                "response_hash": response_hash,
                "signature": signature,
                "payment_auth_hash": keccak_hex({"auth": payment}),
                "attest_tx": attest_tx,
            }
        )

    return app


async def _ensure_offer(bridge: ChainBridge, specialist: Specialist, endpoint: str) -> str:
    """Registers the agent (idempotent) and returns an active offer id for
    it. Reuses the most recent active OfferPublished event if one exists,
    otherwise publishes a fresh offer. This makes restarts cheap — without
    it every fleet boot would publish 8 fresh offers and burn deployer gas
    on every restart even though the previous offers are still on-chain
    and active.
    """
    try:
        bridge.register_agent(specialist.agent_id, f"ipfs://specialist/{specialist.name}")
    except Exception:
        pass  # already registered; ignore

    cached = _find_active_offer(bridge, specialist.agent_id)
    if cached is not None:
        return cached

    tx_hash = bridge.publish_offer(
        agent_id=specialist.agent_id,
        service_type_hash=specialist.service_type_hash,
        schema_hash=specialist.schema_hash,
        price_per_query=specialist.price_per_query_usdc_6,
        endpoint_url=endpoint,
    )
    # The tx mined; pull the OfferPublished event from the receipt to learn
    # the offer id. We re-fetch the receipt because publish_offer currently
    # only returns the tx hash.
    receipt = bridge.w3.eth.get_transaction_receipt(tx_hash)
    events = bridge.marketplace.events.OfferPublished().process_receipt(receipt)
    if not events:
        # No event in ABI — fall back to a deterministic placeholder.
        # The on-chain offer is still live; the trader can find it by
        # querying offers(agentId) once that view is exposed.
        return keccak_text(f"offer:{specialist.name}:{tx_hash}")
    return _hex0x(events[0]["args"]["offerId"])


def _find_active_offer(bridge: ChainBridge, agent_id: str) -> str | None:
    """Scans the recent past for OfferPublished(agentId=...) events and
    returns the most recent offer that is still flagged active on-chain.
    Looks back ~14 days at 4s/block; tweak if blocks-per-day changes."""
    try:
        latest = bridge.w3.eth.block_number
        lookback_blocks = 14 * 24 * 60 * 60 // 4  # ~14 days at 4s/block
        from_block = max(0, latest - lookback_blocks)
        logs = bridge.marketplace.events.OfferPublished().get_logs(
            from_block=from_block,
            argument_filters={"agentId": _to_bytes32(agent_id)},
        )
    except Exception as e:
        print(f"[server] could not scan past offers ({e}); will publish fresh", flush=True)
        return None

    # Newest first — first active one wins.
    for log in reversed(list(logs)):
        offer_id_bytes = log["args"]["offerId"]
        try:
            offer = bridge.marketplace.functions.offers(offer_id_bytes).call()
        except Exception:
            continue
        # offers(bytes32) returns (agentId, serviceTypeHash, schemaHash,
        # pricePerQuery, endpointURL, active) — `active` is the 6th field.
        if len(offer) >= 6 and bool(offer[5]):
            return _hex0x(offer_id_bytes)

    return None


def run(specialist: Specialist, *, host: str = "0.0.0.0", port: int = 0) -> None:
    """Convenience entry point. PORT env var wins over the argument."""
    import uvicorn

    actual_port = int(os.environ.get("PORT", port or 7400))
    uvicorn.run(build_app(specialist), host=host, port=actual_port)
