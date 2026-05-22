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
