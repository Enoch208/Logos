"""End-to-end: a specialist's FastAPI app responds correctly to the trader
SDK's two-round x402 flow without any network involvement."""

from __future__ import annotations

import os
from collections.abc import Iterator

import httpx
import pytest
from eth_account import Account

from logos.canonical import keccak_hex
from logos.server import FLEET_REGISTRY, ReasoningTrace, Specialist, build_app, register_in_fleet
from logos.settlement import encode_header, sign_receive_authorization
from logos.signing import verify_attestation


CHAIN_ID = 421614
MARKETPLACE = "0x" + "ab" * 20


class EchoSpecialist(Specialist):
    name = "echo"
    service_type = "echo"
    price_per_query_usdc_6 = 100
    response_schema = {
        "type": "object",
        "properties": {"echo": {"type": "string"}},
        "required": ["echo"],
    }

    async def handle(self, payload, *, trace: ReasoningTrace):
        trace.step("received payload")
        return {"echo": payload.get("msg", "")}


@pytest.fixture(autouse=True)
def env(monkeypatch: pytest.MonkeyPatch) -> Iterator[Account]:
    acct = Account.create()
    monkeypatch.setenv("ARC_CHAIN_ID", str(CHAIN_ID))
    monkeypatch.setenv("MARKETPLACE_ADDRESS", MARKETPLACE)
    monkeypatch.setenv("SPECIALIST_PRIVATE_KEY", acct.key.hex())
    monkeypatch.setenv("SPECIALIST_PAYOUT_ADDRESS", acct.address)
    yield acct


async def _httpx_app(spec: Specialist) -> httpx.AsyncClient:
    app = build_app(spec)
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def test_health_returns_offer_descriptor() -> None:
    async with await _httpx_app(EchoSpecialist()) as http:
        resp = await http.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["specialist"] == "echo"
        assert body["service_type"] == "echo"
        assert body["price_per_query_usdc_6"] == 100


async def test_run_first_pass_returns_402_with_x402_headers() -> None:
    async with await _httpx_app(EchoSpecialist()) as http:
        resp = await http.post("/run", json={"msg": "hi"})
        assert resp.status_code == 402
        assert resp.headers["x-402-price"] == "100"
        assert resp.headers["x-402-chain-id"] == str(CHAIN_ID)
        assert resp.headers["x-402-query-id"].startswith("0x")


async def test_run_second_pass_returns_attested_response(env: Account) -> None:
    async with await _httpx_app(EchoSpecialist()) as http:
        probe = await http.post("/run", json={"msg": "hi"})
        query_id = probe.headers["x-402-query-id"]
        auth = keccak_hex({"any": "token"})

        paid = await http.post(
            "/run",
            json={"msg": "hi"},
            headers={"X-Payment-Auth": auth, "X-402-Query-Id": query_id},
        )
        assert paid.status_code == 200
        body = paid.json()
        assert body["query_id"] == query_id
        assert body["payload"] == {"echo": "hi"}
        assert body["signature"].startswith("0x")
        assert body["trace_cid"]  # at minimum a dev-stub CID

        # Signature verifies against the specialist's registered key.
        assert verify_attestation(
            signature=body["signature"],
            expected_signer=env.address,
            chain_id=CHAIN_ID,
            marketplace_address=MARKETPLACE,
            query_id=query_id,
            response_hash=body["response_hash"],
            trace_cid=body["trace_anchor"],
        )


class _FakeBridge:
    def __init__(self) -> None:
        self.submitted: list = []

    def submit_receive_with_authorization(self, auth):
        self.submitted.append(auth)
        return "0x" + "fe" * 32

    def attest_response(self, **kwargs):
        return "0x" + "ad" * 32


async def test_real_mode_settles_then_serves(
    monkeypatch: pytest.MonkeyPatch, env: Account
) -> None:
    monkeypatch.setenv("SETTLEMENT_MODE", "real")
    monkeypatch.setenv("ARC_CHAIN_ID", "5042002")
    spec = EchoSpecialist()
    fake = _FakeBridge()
    register_in_fleet(spec.name, fake, "0x" + "01" * 32)
    try:
        async with await _httpx_app(spec) as http:
            probe = await http.post("/run", json={"msg": "hi"})
            query_id = probe.headers["x-402-query-id"]
            payee = probe.headers["x-402-recipient"]
            trader = Account.create()
            auth = sign_receive_authorization(
                trader.key, to=payee, value=spec.price_per_query_usdc_6, chain_id=5042002
            )
            paid = await http.post(
                "/run",
                json={"msg": "hi"},
                headers={"X-Payment-Auth": encode_header(auth), "X-402-Query-Id": query_id},
            )
            assert paid.status_code == 200
            assert paid.json()["settlement_tx"] == "0x" + "fe" * 32
            assert len(fake.submitted) == 1
    finally:
        FLEET_REGISTRY.pop(spec.name, None)


async def test_real_mode_bad_auth_returns_402_without_serving(
    monkeypatch: pytest.MonkeyPatch, env: Account
) -> None:
    monkeypatch.setenv("SETTLEMENT_MODE", "real")
    monkeypatch.setenv("ARC_CHAIN_ID", "5042002")
    spec = EchoSpecialist()
    fake = _FakeBridge()
    register_in_fleet(spec.name, fake, "0x" + "01" * 32)
    try:
        async with await _httpx_app(spec) as http:
            probe = await http.post("/run", json={"msg": "hi"})
            query_id = probe.headers["x-402-query-id"]
            paid = await http.post(
                "/run",
                json={"msg": "hi"},
                headers={"X-Payment-Auth": "not-a-valid-header", "X-402-Query-Id": query_id},
            )
            assert paid.status_code == 402
            assert "payload" not in paid.json()
            assert fake.submitted == []
    finally:
        FLEET_REGISTRY.pop(spec.name, None)


async def test_schema_violation_returns_500() -> None:
    class BadSpecialist(EchoSpecialist):
        async def handle(self, payload, *, trace):
            return {"wrong_field": 42}  # missing "echo"

    async with await _httpx_app(BadSpecialist()) as http:
        probe = await http.post("/run", json={"msg": "x"})
        query_id = probe.headers["x-402-query-id"]
        paid = await http.post(
            "/run",
            json={"msg": "x"},
            headers={"X-Payment-Auth": "0xdead", "X-402-Query-Id": query_id},
        )
        assert paid.status_code == 500
