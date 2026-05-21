"""Specialist runner.

Subclass `Specialist` and implement `handle(query) -> dict`. The framework
wraps it as a FastAPI app with the x402 payment-required dance, signs the
attestation, pins the trace, and returns the AttestedResponse to the
trader.

Example
-------

    from logos.server import Specialist, run

    class MandarinMacro(Specialist):
        name = "mandarin_macro"
        service_type = "translation"
        price_per_query_usdc_6 = 150  # = $0.000150
        response_schema = {"type": "object", ...}

        async def handle(self, payload, *, trace):
            # ... do work ...
            trace.step("Parsed PBoC frame")
            return {"translated_text": "...", "confidence_score": 0.99}

    if __name__ == "__main__":
        run(MandarinMacro())
"""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from .canonical import canonical_dumps, keccak_hex
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


def _required_env(var: str) -> str:
    v = os.environ.get(var)
    if not v:
        raise RuntimeError(f"missing required env var: {var}")
    return v


def build_app(specialist: Specialist) -> FastAPI:
    app = FastAPI(title=f"logos-specialist:{specialist.name}")

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {
            "ok": True,
            "specialist": specialist.name,
            "service_type": specialist.service_type,
            "price_per_query_usdc_6": specialist.price_per_query_usdc_6,
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
        # The Marketplace anchor expects a 32-byte CID; CIDv1-multihash digest
        # would be that, but we keep this simple for v1 — derive a 32-byte
        # tag from the canonical trace itself.
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

        return JSONResponse(
            {
                "query_id": query_id,
                "payload": result,
                "trace_cid": cid,
                "trace_anchor": trace_anchor,
                "response_hash": response_hash,
                "signature": signature,
                "payment_auth_hash": keccak_hex({"auth": payment}),
            }
        )

    return app


def run(specialist: Specialist, *, host: str = "0.0.0.0", port: int = 0) -> None:
    """Convenience entry point. PORT env var wins over the argument."""
    import uvicorn

    actual_port = int(os.environ.get("PORT", port or 7400))
    uvicorn.run(build_app(specialist), host=host, port=actual_port)
