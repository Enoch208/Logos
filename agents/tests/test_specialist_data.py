"""Real-data specialists — pure response mappers (no network)."""
from __future__ import annotations

import pytest

from specialists.onchain_dex_data.main import _map_dexscreener


def test_dex_picks_deepest_liquidity_pair() -> None:
    data = {
        "pairs": [
            {"pairAddress": "0xaaa", "volume": {"h24": 100.0}, "liquidity": {"usd": 1_000.0}},
            {"pairAddress": "0xbbb", "volume": {"h24": 500.0}, "liquidity": {"usd": 9_000.0}},
        ]
    }
    out = _map_dexscreener(data, "0xtoken")
    assert out["pair_address"] == "0xbbb"
    assert out["volume_24h_usdc"] == 500.0
    assert out["liquidity_depth_usdc"] == 9_000.0


def test_dex_no_pairs_raises() -> None:
    with pytest.raises(ValueError):
        _map_dexscreener({"pairs": []}, "0xtoken")


def test_dex_tolerates_missing_fields() -> None:
    out = _map_dexscreener({"pairs": [{"pairAddress": "0xccc"}]}, "0xtoken")
    assert out["pair_address"] == "0xccc"
    assert out["volume_24h_usdc"] == 0.0
    assert out["liquidity_depth_usdc"] == 0.0
