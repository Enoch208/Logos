import Link from "next/link";
import { ArrowLeft01Icon, Timer01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import type { SpecialistAgent } from "@/data/mockData";
import {
  formatLatency,
  formatNumberFull,
  formatPercent,
  formatReputation,
} from "@/lib/format";

const SERVICE_LABEL: Record<string, string> = {
  translation: "Translation",
  market_sentiment: "Sentiment",
  polymarket_structuring: "Structuring",
  whale_tracking: "Whale flow",
  risk_evaluation: "Risk",
  news_summarization: "News",
  capital_allocation: "Sizing",
  dex_telemetry: "DEX telemetry",
};

export function SpecialistHeader({ agent }: { agent: SpecialistAgent }) {
  const label = SERVICE_LABEL[agent.serviceType] ?? agent.serviceType;
  return (
    <div>
      <Link
        href="/dashboard/specialists"
        className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft01Icon size={13} strokeWidth={1.5} />
        all specialists
      </Link>

      <div className="mt-5 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate font-mono text-2xl text-foreground">{agent.name}</h1>
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                agent.active ? "bg-emerald-400" : "bg-muted"
              }`}
            />
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {label} · {agent.id.slice(0, 14)}…
          </p>
        </div>
        <div className="flex items-end gap-8">
          <Field label="Per query" value={`$${agent.pricePerQueryUsdc.toFixed(6)}`} accent />
          <Field label="Reputation" value={`${formatReputation(agent.reputation)}/10`} />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Queries served" value={formatNumberFull(agent.metrics.queriesServed)} />
        <Field label="USDC earned" value={`$${agent.metrics.totalEarnedUsdc.toFixed(4)}`} />
        <Field
          label={<><Timer01Icon size={9} strokeWidth={1.5} className="inline" /> P95 latency</>}
          value={formatLatency(agent.metrics.latencyP95ms)}
        />
        <Field
          label={<><CheckmarkCircle02Icon size={9} strokeWidth={1.5} className="inline" /> Schema</>}
          value={formatPercent(agent.metrics.complianceRate, 1)}
        />
      </dl>
    </div>
  );
}

function Field({
  label,
  value,
  accent = false,
}: {
  label: React.ReactNode;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">{label}</dt>
      <dd className={`font-mono text-[15px] ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}
