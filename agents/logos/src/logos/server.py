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

import json
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
        settlement_mode = os.environ.get("SETTLEMENT_MODE", "simulated")
        # Case-preserved: a base64 EIP-3009 blob in real mode, a hex token in
        # simulated mode. extract_payment_header lower-cases, so don't route the
        # base64 through it.
        payment_raw = headers.get("x-payment-auth")

        if not payment_raw:
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

        # Real settlement (pay-before-serve): verify the EIP-3009 authorization
        # and pull real USDC on-chain before doing any work. Any failure → 402.
        settlement_tx: str | None = None
        if settlement_mode == "real":
            from .settlement import USDC_ADDRESS, decode_header, verify_authorization

            bridge_settle, _ = _live_state()
            if bridge_settle is None:
                return Response(
                    status_code=402,
                    content=canonical_dumps({"reason": "settlement unavailable: no chain bridge"}),
                    media_type="application/json",
                )
            try:
                auth = decode_header(payment_raw)
                verify_authorization(
                    auth,
                    expected_payee=recipient,
                    min_value=specialist.price_per_query_usdc_6,
                    chain_id=chain_id,
                    usdc=USDC_ADDRESS,
                )
                settlement_tx = bridge_settle.submit_receive_with_authorization(auth)
            except Exception as e:
                return Response(
                    status_code=402,
                    content=canonical_dumps({"reason": f"settlement failed: {e}"}),
                    media_type="application/json",
                )
            payment_auth_hash = keccak_hex(auth)
        else:
            payment_auth_hash = keccak_hex({"auth": extract_payment_header(headers)})

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
                "payment_auth_hash": payment_auth_hash,
                "settlement_tx": settlement_tx,
                "attest_tx": attest_tx,
            }
        )

    return app


_OFFER_CACHE_PATH = os.environ.get("LOGOS_OFFER_CACHE", ".fleet-offers.json")
"""agentId → offerId cache, written next to the running process (cwd is
agents/ under PM2). Lets restarts reuse a previously-published offer with
a single eth_call instead of scanning logs — Arc's block time is fast
enough that a log scan either overshoots its range cap or is too slow."""


def _load_offer_cache() -> dict[str, str]:
    try:
        with open(_OFFER_CACHE_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _save_offer_cache(cache: dict[str, str]) -> None:
    try:
        with open(_OFFER_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, sort_keys=True)
    except OSError as e:
        print(f"[server] could not write offer cache ({e})", flush=True)


def _offer_is_active(bridge: ChainBridge, offer_id: str) -> bool:
    """Single eth_call — no log range, immune to RPC range caps + block time."""
    try:
        offer = bridge.marketplace.functions.offers(_to_bytes32(offer_id)).call()
    except Exception:
        return False
    # offers(bytes32) → (agentId, serviceTypeHash, schemaHash, pricePerQuery,
    # endpointURL, active); `active` is the 6th field.
    return len(offer) >= 6 and bool(offer[5])


async def _ensure_offer(bridge: ChainBridge, specialist: Specialist, endpoint: str) -> str:
    """Registers the agent (idempotent) and returns an active offer id.
    Reuses a cached offer if it's still active on-chain, otherwise
    publishes a fresh one and caches it. Without the cache every fleet
    boot would re-publish 8 offers and burn deployer gas even though the
    previous offers are still live."""
    try:
        bridge.register_agent(specialist.agent_id, f"ipfs://specialist/{specialist.name}")
    except Exception:
        pass  # already registered; ignore

    cache = _load_offer_cache()
    cached_id = cache.get(specialist.agent_id)
    if cached_id and _offer_is_active(bridge, cached_id):
        return cached_id

    tx_hash = bridge.publish_offer(
        agent_id=specialist.agent_id,
        service_type_hash=specialist.service_type_hash,
        schema_hash=specialist.schema_hash,
        price_per_query=specialist.price_per_query_usdc_6,
        endpoint_url=endpoint,
    )
    receipt = bridge.w3.eth.get_transaction_receipt(tx_hash)
    events = bridge.marketplace.events.OfferPublished().process_receipt(receipt)
    offer_id = (
        _hex0x(events[0]["args"]["offerId"])
        if events
        else keccak_text(f"offer:{specialist.name}:{tx_hash}")
    )
    cache[specialist.agent_id] = offer_id
    _save_offer_cache(cache)
    return offer_id


def run(specialist: Specialist, *, host: str = "0.0.0.0", port: int = 0) -> None:
    """Convenience entry point. PORT env var wins over the argument."""
    import uvicorn

    actual_port = int(os.environ.get("PORT", port or 7400))
    uvicorn.run(build_app(specialist), host=host, port=actual_port)
