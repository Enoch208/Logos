"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  MARKETPLACE_SUMMARY,
  VOLUME_24H,
  type MarketplaceSummary,
} from "@/data/mockData";
import { formatNumberCompact } from "@/lib/format";
import { CounterTile } from "@/components/dashboard/CounterTile";

const POLL_MS = 15_000;

export function CountersStrip() {
  // Seed values render on the server; the live indexer summary takes over once
  // mounted (falling back to seed if the API is unreachable).
  const [s, setS] = useState<MarketplaceSummary>(MARKETPLACE_SUMMARY);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .summary()
        .then((next) => alive && setS(next))
        .catch(() => {});
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const volumeSpark = VOLUME_24H.map((b) => b.usdc);
  const querySpark = VOLUME_24H.map((b) => b.queries);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CounterTile
        label="Nanopay volume"
        value={`$${s.cumulativeVolumeUsdc.toFixed(4)}`}
        unit="USDC"
        spark={volumeSpark}
        accent
      />
      <CounterTile
        label="Active specialists"
        value={`${s.activeSpecialists}`}
        unit={`/ ${s.activeSpecialists + s.externalAgentsIntegrated}`}
        delta={{ direction: "up", text: `+${s.externalAgentsIntegrated} ext` }}
      />
      <CounterTile
        label="Queries · last hour"
        value={formatNumberCompact(s.queriesLastHour)}
        spark={querySpark}
      />
      <CounterTile
        label="Traces anchored"
        value={formatNumberCompact(s.tracesAnchored)}
        unit="on Arc"
      />
    </div>
  );
}
