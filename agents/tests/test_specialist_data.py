"""Real-data specialists — pure response mappers (no network)."""
from __future__ import annotations

import pytest

from specialists.onchain_dex_data.main import _map_dexscreener
from specialists.polymarket_structurer.main import _best_market, _map_market
from specialists.risk_checker.main import _liq_prob, _slippage_band


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


# --- polymarket_structurer → Gamma ---


def test_gamma_map_parses_stringified_outcomes() -> None:
    m = {"question": "Will BTC hit 100k?", "conditionId": "0xabc", "outcomes": '["Yes", "No"]'}
    out = _map_market(m, "Yes it will")
    assert out["resolved_condition_id"] == "0xabc"
    assert out["outcome_parameters"] == ["Yes", "No"]
    assert out["market_title"] == "Will BTC hit 100k?"
    assert out["selected_outcome"] == "Yes"


def test_gamma_map_selects_no_for_no_lean() -> None:
    m = {"question": "Will the Fed cut?", "conditionId": "0xdef", "outcomes": '["Yes", "No"]'}
    assert _map_market(m, "No Cut")["selected_outcome"] == "No"


def test_gamma_best_market_keyword_match() -> None:
    markets = [
        {"question": "Will the Fed cut rates?", "liquidity": 100, "conditionId": "0x1", "outcomes": '["Yes","No"]'},
        {"question": "Will it rain tomorrow?", "liquidity": 999, "conditionId": "0x2", "outcomes": '["Yes","No"]'},
    ]
    assert _best_market(markets, "Federal Reserve rates decision")["conditionId"] == "0x1"


def test_gamma_best_market_none_when_no_overlap() -> None:
    markets = [{"question": "Will it rain?", "liquidity": 1, "conditionId": "0x2", "outcomes": '["Yes","No"]'}]
    assert _best_market(markets, "monetary policy inflation") is None


# --- risk_checker → live liquidity ---


def test_risk_slippage_band_from_liquidity_and_size() -> None:
    assert _slippage_band(100_000_000, 1_000) == "LOW"     # tiny trade, deep pool
    assert _slippage_band(1_000_000, 20_000) == "HIGH"     # ~2% of pool
    assert _slippage_band(100_000, 50_000) == "EXTREME"    # 50% of pool
    assert _slippage_band(0, 1_000) == "EXTREME"           # no liquidity


def test_risk_liq_prob_scales_with_leverage() -> None:
    assert _liq_prob(1) < _liq_prob(5) < _liq_prob(20)
