"""FR-10 — health monitor failure-counting + probe."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from logos.health import HealthMonitor, probe


def test_deactivates_after_threshold_consecutive_failures() -> None:
    mon = HealthMonitor(threshold=3)
    assert mon.record("mm", ok=False) == "noted"  # 1
    assert mon.record("mm", ok=False) == "noted"  # 2
    assert mon.record("mm", ok=False) == "deactivate"  # 3 → crosses
    assert mon.is_deactivated("mm")
    assert mon.failures("mm") == 3


def test_deactivate_fires_only_once() -> None:
    mon = HealthMonitor(threshold=2)
    mon.record("mm", ok=False)
    assert mon.record("mm", ok=False) == "deactivate"
    # still failing — must not keep emitting "deactivate"
    assert mon.record("mm", ok=False) == "noted"
    assert mon.record("mm", ok=False) == "noted"


def test_success_resets_the_counter() -> None:
    mon = HealthMonitor(threshold=3)
    mon.record("mm", ok=False)
    mon.record("mm", ok=False)
    assert mon.failures("mm") == 2
    mon.record("mm", ok=True)
    assert mon.failures("mm") == 0
    # needs a fresh full streak to deactivate
    mon.record("mm", ok=False)
    mon.record("mm", ok=False)
    assert mon.record("mm", ok=False) == "deactivate"


def test_recovery_after_deactivation() -> None:
    mon = HealthMonitor(threshold=2)
    mon.record("mm", ok=False)
    assert mon.record("mm", ok=False) == "deactivate"
    assert mon.is_deactivated("mm")
    assert mon.record("mm", ok=True) == "recovered"
    assert not mon.is_deactivated("mm")


def test_independent_specialists_tracked_separately() -> None:
    mon = HealthMonitor(threshold=2)
    mon.record("a", ok=False)
    mon.record("b", ok=True)
    assert mon.record("a", ok=False) == "deactivate"
    assert mon.failures("b") == 0
    assert not mon.is_deactivated("b")


async def test_probe_true_on_200() -> None:
    resp = MagicMock(status_code=200)
    http = MagicMock()
    http.get = AsyncMock(return_value=resp)
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)
    with patch("logos.health.httpx.AsyncClient", return_value=http):
        assert await probe("http://x") is True


async def test_probe_false_on_error() -> None:
    http = MagicMock()
    http.get = AsyncMock(side_effect=RuntimeError("connection refused"))
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)
    with patch("logos.health.httpx.AsyncClient", return_value=http):
        assert await probe("http://x") is False


async def test_probe_false_on_non_200() -> None:
    resp = MagicMock(status_code=503)
    http = MagicMock()
    http.get = AsyncMock(return_value=resp)
    http.__aenter__ = AsyncMock(return_value=http)
    http.__aexit__ = AsyncMock(return_value=False)
    with patch("logos.health.httpx.AsyncClient", return_value=http):
        assert await probe("http://x") is False
