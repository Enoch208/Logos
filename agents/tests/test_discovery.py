"""FR-2 discovery on the trader side.

LogosClient should resolve a service_type's endpoint from the explicit
directory when present, otherwise discover it from the indexer's
/api/offers (ranked best-first) and use the top offer's endpoint. No real
network in these tests — httpx is mocked.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from logos.client import LogosClient, QueryFailed


def _fake_http(json_payload: object) -> MagicMock:
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json = MagicMock(return_value=json_payload)
    http = MagicMock()
    http.get = AsyncMock(return_value=resp)
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)
    return http


async def test_explicit_directory_wins_without_http() -> None:
    client = LogosClient(
        specialist_directory={"translation": "http://direct/specialists/mm"},
        discovery_url="http://indexer",
    )
    ep = await client._resolve_endpoint("translation", None)
    assert ep == "http://direct/specialists/mm"


async def test_discovery_picks_top_ranked_offer() -> None:
    client = LogosClient(discovery_url="http://indexer")
    offers = [
        {"endpointUrl": "http://fleet/specialists/best", "reputation": 9.9, "pricePerQueryUsdc": 0.0001},
        {"endpointUrl": "http://fleet/specialists/worse", "reputation": 4.0, "pricePerQueryUsdc": 0.00005},
    ]
    with patch("logos.client.httpx.AsyncClient", return_value=_fake_http(offers)):
        ep = await client._resolve_endpoint("market_sentiment", 0.0002)
    assert ep == "http://fleet/specialists/best"


async def test_discover_returns_empty_without_url() -> None:
    client = LogosClient()  # no directory, no discovery_url
    assert await client.discover("translation") == []


async def test_resolve_raises_when_nothing_found() -> None:
    client = LogosClient(discovery_url="http://indexer")
    with patch("logos.client.httpx.AsyncClient", return_value=_fake_http([])):
        with pytest.raises(QueryFailed, match="discovery returned nothing"):
            await client._resolve_endpoint("translation", None)


async def test_discover_passes_service_type_and_max_price() -> None:
    client = LogosClient(discovery_url="http://indexer")
    http = _fake_http([])
    with patch("logos.client.httpx.AsyncClient", return_value=http):
        await client.discover("risk_evaluation", 0.0003)
    # Confirm the GET hit /api/offers with the right params
    _args, kwargs = http.get.call_args
    assert "/api/offers" in http.get.call_args[0][0]
    assert kwargs["params"]["service_type"] == "risk_evaluation"
    assert kwargs["params"]["max_price"] == "0.0003"


def test_discovery_url_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LOGOS_DISCOVERY_URL", "http://from-env")
    client = LogosClient()
    assert client.discovery_url == "http://from-env"


# --- trace-CID reporting (so the live feed links to a resolvable trace) ---


def _post_client() -> MagicMock:
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    http = MagicMock()
    http.post = AsyncMock(return_value=resp)
    return http


async def test_report_trace_cid_posts_query_and_cid() -> None:
    client = LogosClient(discovery_url="http://indexer")
    http = _post_client()
    qid = "0x" + "ab" * 32
    await client._report_trace_cid(http, qid, "bafyrealcid")
    http.post.assert_awaited_once()
    args, kwargs = http.post.call_args
    assert args[0] == "http://indexer/api/ingest/trace"
    assert kwargs["json"] == {"queryId": qid, "traceCid": "bafyrealcid"}


async def test_report_trace_cid_skips_without_discovery_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("LOGOS_DISCOVERY_URL", raising=False)
    client = LogosClient()
    http = _post_client()
    await client._report_trace_cid(http, "0x" + "ab" * 32, "bafyrealcid")
    http.post.assert_not_awaited()


async def test_report_trace_cid_skips_dev_stub() -> None:
    client = LogosClient(discovery_url="http://indexer")
    http = _post_client()
    await client._report_trace_cid(http, "0x" + "ab" * 32, "dev:deadbeef")
    http.post.assert_not_awaited()


async def test_report_trace_cid_swallows_errors() -> None:
    client = LogosClient(discovery_url="http://indexer")
    http = MagicMock()
    http.post = AsyncMock(side_effect=RuntimeError("indexer down"))
    # Must not raise — a reporting failure can't be allowed to sink the query.
    await client._report_trace_cid(http, "0x" + "ab" * 32, "bafyrealcid")


async def test_report_trace_cid_sends_secret_when_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LOGOS_INGEST_SECRET", "s3cret")
    client = LogosClient(discovery_url="http://indexer")
    http = _post_client()
    await client._report_trace_cid(http, "0x" + "ab" * 32, "bafyrealcid")
    _args, kwargs = http.post.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer s3cret"


# --- payment auth: simulated token vs real EIP-3009 authorization ---


def test_make_payment_auth_simulated_is_keccak_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SETTLEMENT_MODE", "simulated")
    client = LogosClient()
    tok = client._make_payment_auth(
        price=150, recipient="0x" + "22" * 20, query_id="0x" + "01" * 32
    )
    assert tok.startswith("0x") and len(tok) == 66


def test_make_payment_auth_real_is_signed_authorization(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from eth_account import Account

    from logos.contracts import ChainBridge, ChainConfig
    from logos.settlement import decode_header, verify_authorization

    monkeypatch.setenv("SETTLEMENT_MODE", "real")
    trader = Account.create()
    payee = Account.create()

    # ChainBridge whose account is the trader; no network (make_web3 mocked).
    cfg = ChainConfig(
        rpc_url="http://t", chain_id=5042002,
        marketplace="0x" + "ab" * 20, registry="0x" + "cd" * 20,
    )
    monkeypatch.setattr("logos.contracts.make_web3", lambda _c: MagicMock())
    bridge = ChainBridge(cfg, private_key=trader.key.hex())
    client = LogosClient(chain_bridge=bridge, chain_id=5042002)

    header = client._make_payment_auth(
        price=150, recipient=payee.address, query_id="0x" + "01" * 32
    )
    auth = decode_header(header)
    recovered = verify_authorization(
        auth, expected_payee=payee.address, min_value=150, chain_id=5042002
    )
    assert recovered.lower() == trader.address.lower()
