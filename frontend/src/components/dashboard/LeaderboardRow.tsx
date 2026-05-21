import { ArrowUp01Icon } from "hugeicons-react";
import type { SpecialistAgent } from "@/data/mockData";
import { formatReputation } from "@/lib/format";

type Props = {
  rank: number;
  agent: SpecialistAgent;
  metric: "earned" | "reputation" | "queries";
  maxMetric: number;
};

export function LeaderboardRow({ rank, agent, metric, maxMetric }: Props) {
  const raw =
    metric === "earned"
      ? agent.metrics.totalEarnedUsdc
      : metric === "queries"
        ? agent.metrics.queriesServed
        : agent.reputation;
  const valueText =
    metric === "earned"
      ? `$${raw.toFixed(4)}`
      : metric === "queries"
        ? raw.toLocaleString("en-US")
        : `${formatReputation(raw)} / 10`;
  const fillPct = Math.max(8, Math.round((raw / maxMetric) * 100));
  return (
    <li className="group grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(0,0.9fr)_auto] items-center gap-3 border-b border-white/[0.04] px-5 py-3 last:border-b-0 hover:bg-white/[0.015]">
      <span className="font-mono text-[11px] tracking-wider text-muted">
        {rank.toString().padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-[12.5px] text-foreground">
          {agent.name}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {agent.serviceType.replace(/_/g, " ")}
        </p>
      </div>
      <div className="relative hidden h-1.5 overflow-hidden rounded-full bg-white/[0.04] sm:block">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
            rank === 1
              ? "bg-accent"
              : rank <= 3
                ? "bg-accent/60"
                : "bg-foreground/40"
          }`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="flex items-center justify-end gap-2 text-right">
        <span
          className={`font-mono text-[12.5px] ${
            rank === 1 ? "text-accent" : "text-foreground"
          }`}
        >
          {valueText}
        </span>
        {rank <= 3 && (
          <ArrowUp01Icon
            size={11}
            strokeWidth={2}
            className="text-emerald-300"
          />
        )}
      </div>
    </li>
  );
}
