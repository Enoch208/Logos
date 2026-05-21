"""End-to-end test against a live anvil + the deployed contracts.

What this proves:
- Solidity verifies the Python attestation signature (same digest, same recovery)
- Marketplace emits the three events the indexer expects (QueryRecorded,
  ResponseAttested, ResponseRated) in the order the dashboard renders them
- ChainBridge writes succeed against a real EVM, not just a mock

Skipped automatically when `anvil` or `forge` aren't on PATH. When skipped,
the rest of the agents suite (39 mock-only tests) still runs.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import shutil
import socket
import subprocess
import threading
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import httpx
import pytest
from eth_account import Account
from web3 import Web3

from logos.client import LogosClient
from logos.contracts import ChainBridge, ChainConfig


pytestmark = pytest.mark.skipif(
    not (shutil.which("anvil") and shutil.which("forge")),
    reason="anvil + forge required for on-chain e2e",
)


# Anvil's deterministic first account.
DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ANVIL_CHAIN_ID = 31337

CONTRACTS_DIR = Path(__file__).parent.parent.parent / "contracts"


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _wait_for_rpc(url: str, timeout: float = 10.0) -> None:
    deadline = time.monotonic() + timeout
    body = {"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1}
    while time.monotonic() < deadline:
        try:
            with httpx.Client(timeout=1.0) as h:
                r = h.post(url, json=body)
            if r.status_code == 200 and "result" in r.json():
                return
        except Exception:
            pass
        time.sleep(0.1)
    raise RuntimeError(f"anvil at {url} never became ready")


@pytest.fixture(scope="module")
def anvil() -> Iterator[str]:
    port = _free_port()
    rpc = f"http://127.0.0.1:{port}"
    proc = subprocess.Popen(
        ["anvil", "--port", str(port), "--silent"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        _wait_for_rpc(rpc)
        yield rpc
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.fixture(scope="module")
def deployment(anvil: str) -> dict[str, str]:
    env = os.environ.copy()
    env["PRIVATE_KEY"] = DEPLOYER_KEY
    result = subprocess.run(
        [
            "forge",
            "script",
            "script/Deploy.s.sol:Deploy",
            "--rpc-url",
            anvil,
            "--broadcast",
            "--silent",
            "--non-interactive",
        ],
        cwd=str(CONTRACTS_DIR),
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            "forge deploy failed:\n" + result.stdout + "\n---\n" + result.stderr
        )
    deploy_path = CONTRACTS_DIR / "deployments" / f"{ANVIL_CHAIN_ID}.json"
    assert deploy_path.exists(), f"missing {deploy_path} after forge script"
    return json.loads(deploy_path.read_text())


@pytest.fixture(scope="module")
def deployer_bridge(anvil: str, deployment: dict[str, str]) -> ChainBridge:
    cfg = ChainConfig(
        rpc_url=anvil,
        chain_id=ANVIL_CHAIN_ID,
        marketplace=deployment["Marketplace"],
        registry=deployment["AgentRegistry"],
    )
    return ChainBridge(cfg, private_key=DEPLOYER_KEY)


def test_contracts_deployed_and_addressable(deployment: dict[str, str]) -> None:
    assert Web3.is_address(deployment["AgentRegistry"])
    assert Web3.is_address(deployment["Marketplace"])
    assert Web3.is_address(deployment["Reputation"])
    assert deployment["chainId"] == ANVIL_CHAIN_ID


def test_register_publish_record_attest_rate_full_cycle(
    anvil: str,
    deployment: dict[str, str],
    deployer_bridge: ChainBridge,
) -> None:
    """Same wallet plays both specialist and trader for simplicity — anvil
    funds account 0 with 10000 ETH so gas is irrelevant. This exercises the
    full sweep of events the dashboard expects."""

    from logos.canonical import keccak_hex, keccak_text
    from logos.signing import sign_attestation

    agent_id = keccak_text("logos-agent:e2e_translator")
    service_hash = keccak_text("e2e_translation")
    schema_hash = keccak_hex({"type": "object"})

    tx1 = deployer_bridge.register_agent(agent_id, "ipfs://meta")
    assert tx1.startswith("0x") and len(tx1) == 66

    tx2 = deployer_bridge.publish_offer(
        agent_id=agent_id,
        service_type_hash=service_hash,
        schema_hash=schema_hash,
        price_per_query=150,
        endpoint_url="http://localhost:7401",
    )
    receipt2 = deployer_bridge.w3.eth.get_transaction_receipt(tx2)
    offer_events = deployer_bridge.marketplace.events.OfferPublished().process_receipt(
        receipt2
    )
    assert len(offer_events) == 1
    offer_id = "0x" + offer_events[0]["args"]["offerId"].hex()

    payload_hash = keccak_hex({"text_url": "https://pbc.gov.cn/x"})
    payment_hash = keccak_hex({"auth": "0xdead"})
    _tx3, query_id = deployer_bridge.record_query(
        offer_id=offer_id,
        query_payload_hash=payload_hash,
        payment_auth_hash=payment_hash,
    )
    assert query_id.startswith("0x") and len(query_id) == 66

    response_hash = keccak_hex({"translated_text": "x"})
    trace_anchor = keccak_hex({"steps": []})
    signature = sign_attestation(
        private_key=DEPLOYER_KEY,
        chain_id=ANVIL_CHAIN_ID,
        marketplace_address=deployment["Marketplace"],
        query_id=query_id,
        response_hash=response_hash,
        trace_cid=trace_anchor,
    )

    tx4 = deployer_bridge.attest_response(
        query_id=query_id,
        response_hash=response_hash,
        trace_cid=trace_anchor,
        signature=signature,
    )
    assert tx4.startswith("0x")

    tx5 = deployer_bridge.rate(query_id, 5)
    assert tx5.startswith("0x")

    # Reputation should now be > 0 for this agent (EMA pulled toward sample=10e18)
    reputation_addr = deployment["Reputation"]
    rep_abi = [
        {
            "type": "function",
            "name": "reputationFP18",
            "stateMutability": "view",
            "inputs": [{"name": "agentId", "type": "bytes32"}],
            "outputs": [{"name": "", "type": "uint256"}],
        }
    ]
    rep = deployer_bridge.w3.eth.contract(
        address=Web3.to_checksum_address(reputation_addr), abi=rep_abi
    )
    score = rep.functions.reputationFP18(bytes.fromhex(agent_id[2:])).call()
    assert score > 0, "reputation EMA did not move after rate(5)"


# ─── full HTTP + chain trader↔specialist flow ─────────────────────────────


def _run_uvicorn_in_thread(app: Any, port: int) -> threading.Thread:
    import uvicorn

    config = uvicorn.Config(
        app=app, host="127.0.0.1", port=port, log_level="error", lifespan="on"
    )
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    for _ in range(100):
        try:
            httpx.get(f"http://127.0.0.1:{port}/health", timeout=0.2)
            return thread
        except Exception:
            time.sleep(0.05)
    raise RuntimeError("uvicorn never became ready")


@pytest.mark.asyncio
async def test_full_http_query_flow_with_chain(
    anvil: str, deployment: dict[str, str]
) -> None:
    from logos.server import ReasoningTrace, Specialist, build_app

    class E2ESpecialist(Specialist):
        name = "e2e_specialist"
        service_type = "e2e_service"
        price_per_query_usdc_6 = 150
        response_schema = {
            "type": "object",
            "properties": {"echo": {"type": "string"}},
            "required": ["echo"],
        }

        async def handle(
            self, payload: dict[str, Any], *, trace: ReasoningTrace
        ) -> dict[str, Any]:
            trace.step("ran e2e specialist")
            return {"echo": str(payload.get("msg", ""))}

    # Specialist owns its own wallet — anvil prefunds account 1.
    specialist_acct = Account.from_key(
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    )
    trader_acct = Account.from_key(
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    )

    os.environ["ARC_RPC_URL"] = anvil
    os.environ["ARC_CHAIN_ID"] = str(ANVIL_CHAIN_ID)
    os.environ["MARKETPLACE_ADDRESS"] = deployment["Marketplace"]
    os.environ["AGENT_REGISTRY_ADDRESS"] = deployment["AgentRegistry"]
    os.environ["SPECIALIST_PRIVATE_KEY"] = specialist_acct.key.hex()
    os.environ["SPECIALIST_PAYOUT_ADDRESS"] = specialist_acct.address
    os.environ["SPECIALIST_ENDPOINT_URL"] = "http://localhost:7499"

    port = _free_port()
    os.environ["SPECIALIST_ENDPOINT_URL"] = f"http://127.0.0.1:{port}"

    app = build_app(E2ESpecialist())
    _run_uvicorn_in_thread(app, port)

    # The specialist's lifespan should have registered + published its offer.
    health = httpx.get(f"http://127.0.0.1:{port}/health", timeout=5.0).json()
    assert health["on_chain"] is True, health
    assert health["offer_id"], "specialist did not cache its offer_id"

    cfg = ChainConfig(
        rpc_url=anvil,
        chain_id=ANVIL_CHAIN_ID,
        marketplace=deployment["Marketplace"],
        registry=deployment["AgentRegistry"],
    )
    trader_bridge = ChainBridge(cfg, private_key=trader_acct.key.hex())

    client = LogosClient(
        specialist_directory={"e2e_service": f"http://127.0.0.1:{port}"},
        chain_bridge=trader_bridge,
        auto_rate=5,
        chain_id=ANVIL_CHAIN_ID,
        marketplace_address=deployment["Marketplace"],
    )

    response = await client.query(
        service_type="e2e_service",
        payload={"msg": "hello arc"},
        max_price_usdc=0.001,
        verify_signer=specialist_acct.address,
    )

    assert response.payload == {"echo": "hello arc"}
    assert response.signature.startswith("0x")
    assert response.query_id.startswith("0x")

    # Verify on-chain reputation moved — proves rate() landed.
    rep_abi = [
        {
            "type": "function",
            "name": "reputationFP18",
            "stateMutability": "view",
            "inputs": [{"name": "agentId", "type": "bytes32"}],
            "outputs": [{"name": "", "type": "uint256"}],
        }
    ]
    rep = trader_bridge.w3.eth.contract(
        address=Web3.to_checksum_address(deployment["Reputation"]), abi=rep_abi
    )
    from logos.canonical import keccak_text

    score = rep.functions.reputationFP18(
        bytes.fromhex(keccak_text(f"logos-agent:{E2ESpecialist.name}")[2:])
    ).call()
    assert score > 0, "reputation EMA did not move — rate() did not land"
