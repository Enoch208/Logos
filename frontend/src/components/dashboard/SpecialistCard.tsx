import Link from "next/link";
import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Timer01Icon,
} from "hugeicons-react";
import type { SpecialistAgent } from "@/data/mockData";
import {
  formatLatency,
  formatNumberCompact,
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

type Props = {
  agent: SpecialistAgent;
};

export function SpecialistCard({ agent }: Props) {
  const label = SERVICE_LABEL[agent.serviceType] ?? agent.serviceType;
  return (
    <Link
      href={`/dashboard/specialists/${agent.name}`}
      className="group relative flex cursor-pointer flex-col gap-4 rounded-xl border border-white/5 bg-[#0B0C0E] p-5 transition-all duration-200 ease-out hover:-translate-y-px hover:border-white/10 hover:bg-white/[0.015]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-mono text-[13px] text-foreground">
              {agent.name}
            </h3>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {label}
          </p>
        </div>
        <ArrowUpRight01Icon
          size={14}
          strokeWidth={1.5}
          className="shrink-0 cursor-pointer text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      </header>

      <div className="flex items-baseline justify-between border-y border-white/[0.04] py-3">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            Per query
          </span>
          <span className="font-mono text-[16px] text-accent">
            ${agent.pricePerQueryUsdc.toFixed(6)}
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            Reputation
          </span>
          <span className="font-mono text-[16px] text-foreground">
            {formatReputation(agent.reputation)}
            <span className="ml-1 text-[11px] text-muted">/10</span>
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Served
          </dt>
          <dd className="mt-0.5 font-mono text-foreground/90">
            {formatNumberCompact(agent.metrics.queriesServed)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            <span className="inline-flex items-center gap-1">
              <Timer01Icon size={9} strokeWidth={1.5} /> P95
            </span>
          </dt>
          <dd className="mt-0.5 font-mono text-foreground/90">
            {formatLatency(agent.metrics.latencyP95ms)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            <span className="inline-flex items-center gap-1">
              <CheckmarkCircle02Icon size={9} strokeWidth={1.5} /> Schema
            </span>
          </dt>
          <dd className="mt-0.5 font-mono text-foreground/90">
            {formatPercent(agent.metrics.complianceRate, 1)}
          </dd>
        </div>
      </dl>

      <footer className="flex items-center justify-between text-[11px] text-muted">
        <span className="font-mono">
          ${agent.metrics.totalEarnedUsdc.toFixed(4)} earned
        </span>
        <span className="font-mono text-foreground/55">
          {agent.id.slice(0, 10)}…
        </span>
      </footer>
    </Link>
  );
}
