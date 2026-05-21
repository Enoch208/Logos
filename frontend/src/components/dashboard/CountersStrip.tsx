import { MARKETPLACE_SUMMARY, VOLUME_24H } from "@/data/mockData";
import { formatNumberCompact } from "@/lib/format";
import { CounterTile } from "@/components/dashboard/CounterTile";

export function CountersStrip() {
  const s = MARKETPLACE_SUMMARY;
  const volumeSpark = VOLUME_24H.map((b) => b.usdc);
  const querySpark = VOLUME_24H.map((b) => b.queries);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CounterTile
        label="Nanopay volume"
        value={`$${s.cumulativeVolumeUsdc.toFixed(4)}`}
        unit="USDC"
        delta={{ direction: "up", text: "12.4%" }}
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
        delta={{ direction: "up", text: "19.5%" }}
        spark={querySpark}
      />
      <CounterTile
        label="Traces anchored"
        value={formatNumberCompact(s.tracesAnchored)}
        unit="on Arc"
        delta={{ direction: "up", text: "+47 · 24h" }}
      />
    </div>
  );
}
