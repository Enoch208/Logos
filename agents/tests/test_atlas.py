"""Atlas decision logic — it should DECIDE, not just execute a fixed recipe:
skip translation when the source is already English, and let the sentiment it
buys drive conviction."""
from __future__ import annotations

from atlas.main import _conviction_from_sentiment, _needs_translation


def test_skips_translation_for_english_source() -> None:
    need, why = _needs_translation({"raw_text": "US CPI is tracking near consensus."})
    assert need is False
    assert "English" in why


def test_buys_translation_for_cjk_source() -> None:
    need, why = _needs_translation({"raw_text": "美联储维持利率不变。"})
    assert need is True
    assert "CJK" in why


def test_buys_translation_for_remote_url() -> None:
    need, _ = _needs_translation({"text_url": "https://www.pbc.gov.cn/notice"})
    assert need is True


def test_buys_translation_when_no_inline_source() -> None:
    need, _ = _needs_translation({})
    assert need is True


def test_conviction_scales_with_sentiment_strength() -> None:
    weak = _conviction_from_sentiment(-0.2, 0.5)
    strong = _conviction_from_sentiment(-0.9, 0.5)
    assert strong > weak
    assert 0.5 <= weak <= 0.95
    assert 0.5 <= strong <= 0.95


def test_conviction_falls_back_when_no_sentiment() -> None:
    assert _conviction_from_sentiment(0.0, 0.73) == 0.73
