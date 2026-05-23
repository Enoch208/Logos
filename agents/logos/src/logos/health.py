"""FR-10 — specialist health monitoring + auto-deactivate.

A watchdog probes each specialist's /health endpoint on an interval. A
specialist that fails `threshold` consecutive probes is auto-deactivated:
its offer is flipped inactive on-chain (via ChainBridge.deactivate_offer),
so it drops out of discovery until it recovers and is re-registered.

The failure-counting core (`HealthMonitor`) is pure and deterministic —
no network, no clock — so it's fully unit-testable. The async probing +
on-chain deactivation live in `run_monitor`, which is opt-in (you start
it explicitly; it isn't wired into the serving fleet, so a transient
network blip can't silently nuke a live demo).
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

import httpx

from .contracts import ChainBridge


@dataclass
class HealthMonitor:
    """Tracks consecutive liveness failures per specialist and decides when
    one crosses the deactivation threshold."""

    threshold: int = 3
    _fails: dict[str, int] = field(default_factory=dict)
    _deactivated: set[str] = field(default_factory=set)

    def record(self, name: str, ok: bool) -> str:
        """Record one probe result. Returns the action to take:
        - "deactivate" exactly once, when failures first cross the threshold
        - "recovered" when a previously-deactivated specialist responds again
        - "ok" / "noted" otherwise
        """
        if ok:
            had_failures = self._fails.get(name, 0) > 0
            self._fails[name] = 0
            if name in self._deactivated:
                self._deactivated.discard(name)
                return "recovered"
            return "ok" if not had_failures else "recovered"

        self._fails[name] = self._fails.get(name, 0) + 1
        if self._fails[name] >= self.threshold and name not in self._deactivated:
            self._deactivated.add(name)
            return "deactivate"
        return "noted"

    def failures(self, name: str) -> int:
        return self._fails.get(name, 0)

    def is_deactivated(self, name: str) -> bool:
        return name in self._deactivated


async def probe(url: str, *, timeout: float = 5.0) -> bool:
    """One liveness probe. True iff /health returns 200 with on-chain or
    off-chain readiness."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as http:
            r = await http.get(f"{url}/health")
            return r.status_code == 200
    except Exception:
        return False


async def run_monitor(
    *,
    specialists: dict[str, str],  # name -> base url
    offer_ids: dict[str, str],  # name -> offer id (for on-chain deactivation)
    bridge: ChainBridge | None = None,
    threshold: int = 3,
    interval_s: float = 30.0,
    monitor: HealthMonitor | None = None,
) -> None:
    """Probe loop. On `threshold` consecutive failures for a specialist,
    deactivates its offer on-chain (if a bridge + offer id are available)."""
    mon = monitor or HealthMonitor(threshold=threshold)
    print(
        f"[monitor] watching {len(specialists)} specialists · "
        f"threshold={threshold} · interval={interval_s}s",
        flush=True,
    )
    while True:
        for name, url in specialists.items():
            ok = await probe(url)
            action = mon.record(name, ok)
            if action == "deactivate":
                print(
                    f"[monitor] {name} failed {mon.failures(name)} consecutive "
                    f"probes — deactivating",
                    flush=True,
                )
                offer_id = offer_ids.get(name)
                if bridge and offer_id:
                    try:
                        tx = bridge.deactivate_offer(offer_id)
                        print(f"[monitor] {name} offer deactivated · tx={tx[:14]}…", flush=True)
                    except Exception as e:
                        print(f"[monitor] {name} deactivate failed: {e}", flush=True)
            elif action == "recovered":
                print(f"[monitor] {name} recovered", flush=True)
        await asyncio.sleep(interval_s)
