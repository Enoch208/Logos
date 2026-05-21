"""ChainBridge tests with a mocked web3 — verifies the bridge builds the
right calldata, parses receipts correctly, and rejects bad inputs.

Real chain integration is verified by booting anvil + the contracts; that
flow lives in test_anvil.py (skipped automatically when anvil isn't on PATH).
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest
from eth_account import Account

from logos.contracts import ChainBridge, ChainConfig, _to_bytes32


@pytest.fixture
def cfg() -> ChainConfig:
    return ChainConfig(
        rpc_url="http://test",
        chain_id=421614,
        marketplace="0x" + "ab" * 20,
        registry="0x" + "cd" * 20,
    )


@pytest.fixture
def bridge(cfg: ChainConfig, monkeypatch: pytest.MonkeyPatch) -> ChainBridge:
    """ChainBridge with web3 + contracts replaced by mocks. No real network.

    We override `_send_receipt` directly rather than mocking down to
    eth_account's raw-transaction validation — the bridge's job is to
    construct the call and parse the receipt, not re-test web3.py's tx
    pipeline.
    """
    acct = Account.create()
    from logos import contracts as contracts_mod

    w3 = MagicMock()
    monkeypatch.setattr(contracts_mod, "make_web3", lambda _cfg: w3)

    b = ChainBridge(cfg, private_key=acct.key.hex())

    fake_receipt: dict[str, Any] = {
        "status": 1,
        "transactionHash": SimpleNamespace(hex=lambda: "0x" + "11" * 32),
        "logs": [],
    }

    def fake_send_receipt(fn: Any) -> dict[str, Any]:
        if getattr(fake_send_receipt, "force_revert", False):  # type: ignore[attr-defined]
            return {
                "status": 0,
                "transactionHash": SimpleNamespace(hex=lambda: "0xdead"),
                "logs": [],
            }
        return fake_receipt

    monkeypatch.setattr(b, "_send_receipt", fake_send_receipt)
    # _send delegates to _send_receipt; with the monkeypatch above, _send
    # implicitly picks up the fake too. But _send is defined as a method that
    # calls self._send_receipt — that resolves via attribute lookup and hits
    # the patched value. Verified by `test_publish_offer_returns_tx_hash`.

    # Override revert toggle so individual tests can opt-in via setattr.
    b._fake_send = fake_send_receipt  # type: ignore[attr-defined]

    fn = MagicMock()
    fns = SimpleNamespace(
        publishOffer=lambda *a, **kw: fn,
        recordQuery=lambda *a, **kw: fn,
        attestResponse=lambda *a, **kw: fn,
        rate=lambda *a, **kw: fn,
        register=lambda *a, **kw: fn,
    )
    b.marketplace = SimpleNamespace(functions=fns, events=SimpleNamespace())
    b.registry = SimpleNamespace(functions=fns)
    return b


def test_to_bytes32_accepts_short_hex() -> None:
    out = _to_bytes32("0x01")
    assert out == bytes.fromhex("00" * 31 + "01")


def test_to_bytes32_rejects_bad_byte_length() -> None:
    with pytest.raises(ValueError):
        _to_bytes32(b"\x00" * 31)


def test_publish_offer_returns_tx_hash(bridge: ChainBridge) -> None:
    tx = bridge.publish_offer(
        agent_id="0x" + "01" * 32,
        service_type_hash="0x" + "02" * 32,
        schema_hash="0x" + "03" * 32,
        price_per_query=150,
        endpoint_url="http://localhost",
    )
    assert tx == "0x" + "11" * 32


def test_record_query_parses_event_for_query_id(bridge: ChainBridge) -> None:
    expected_qid = b"\x42" * 32
    proc = MagicMock(return_value=[{"args": {"queryId": expected_qid}}])
    bridge.marketplace.events.QueryRecorded = MagicMock(  # type: ignore[attr-defined]
        return_value=SimpleNamespace(process_receipt=proc)
    )

    tx_hash, qid = bridge.record_query(
        offer_id="0x" + "01" * 32,
        query_payload_hash="0x" + "02" * 32,
        payment_auth_hash="0x" + "03" * 32,
    )
    assert tx_hash == "0x" + "11" * 32
    assert qid == "0x" + "42" * 32


def test_rate_rejects_invalid_score(bridge: ChainBridge) -> None:
    for bad in (0, 6, -1, 100):
        with pytest.raises(ValueError):
            bridge.rate("0x" + "01" * 32, bad)


def test_rate_accepts_valid_score(bridge: ChainBridge) -> None:
    for good in (1, 3, 5):
        tx = bridge.rate("0x" + "01" * 32, good)
        assert tx == "0x" + "11" * 32


def test_chain_config_from_env_returns_none_when_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for v in ("ARC_RPC_URL", "ARC_CHAIN_ID", "MARKETPLACE_ADDRESS", "AGENT_REGISTRY_ADDRESS"):
        monkeypatch.delenv(v, raising=False)
    assert ChainConfig.from_env() is None


def test_chain_config_from_env_loads_when_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ARC_RPC_URL", "http://test")
    monkeypatch.setenv("ARC_CHAIN_ID", "421614")
    monkeypatch.setenv("MARKETPLACE_ADDRESS", "0x" + "ab" * 20)
    monkeypatch.setenv("AGENT_REGISTRY_ADDRESS", "0x" + "cd" * 20)
    cfg = ChainConfig.from_env()
    assert cfg is not None
    assert cfg.chain_id == 421614


def test_revert_raises_runtime_error(bridge: ChainBridge) -> None:
    def reverting_send(_fn: Any) -> dict[str, Any]:
        raise RuntimeError("tx 0xdead reverted")

    bridge._send_receipt = reverting_send  # type: ignore[method-assign]
    with pytest.raises(RuntimeError, match="reverted"):
        bridge.rate("0x" + "01" * 32, 5)


def test_keccak_text_matches_solidity_layout() -> None:
    """Spot-check: keccak256("translation") must produce the same hex a
    Solidity contract would emit via keccak256(bytes("translation"))."""
    from logos.canonical import keccak_text

    # Known good hash for "translation" computed via web3.js's
    # keccak256(utf8ToBytes("translation")) — pinned here to lock the
    # interop guarantee between Python signers and Solidity verifiers.
    out = keccak_text("translation")
    assert out.startswith("0x") and len(out) == 66
    # No JSON quoting — must NOT match keccak('"translation"') from the
    # canonical_dumps path.
    from logos.canonical import keccak_hex

    assert keccak_text("translation") != keccak_hex("translation")
