import { ArrowUpRight01Icon } from "hugeicons-react";
import type { SpecialistAgent } from "@/data/mockData";

export function SpecialistRow({ s }: { s: SpecialistAgent }) {
  const earned = s.metrics.totalEarnedUsdc;
  const queries = s.metrics.queriesServed;
  return (
    <div className="group grid cursor-pointer grid-cols-12 items-center gap-4 border-b border-white/[0.04] px-5 py-4 text-sm transition-colors hover:bg-white/[0.02] last:border-b-0">
      {/* Agent: live dot + name + truncated ID */}
      <div className="col-span-12 flex min-w-0 items-center gap-3 md:col-span-3">
        <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40"
          />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium text-foreground">
            {s.name}
          </span>
          <span className="truncate font-mono text-[10px] text-muted">
            0x{s.id.slice(2, 6)}…{s.id.slice(-4)}
          </span>
        </div>
      </div>

      {/* Service */}
      <span className="col-span-6 truncate font-mono text-[11px] text-muted md:col-span-2">
        {s.serviceType}
      </span>

      {/* Price */}
      <span className="col-span-6 text-right font-mono text-[12px] text-foreground/85 md:col-span-2 md:text-left">
        ${s.pricePerQueryUsdc.toFixed(6)}
      </span>

      {/* Reputation bar */}
      <div className="col-span-12 md:col-span-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-accent">
            {s.reputation.toFixed(2)}
          </span>
          <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span
              className="block h-full rounded-full bg-accent/60"
              style={{ width: `${(s.reputation / 10) * 100}%` }}
            />
          </span>
        </div>
      </div>

      {/* P95 latency */}
      <span className="col-span-3 hidden font-mono text-[11px] text-muted md:inline-block md:col-span-1">
        {s.metrics.latencyP95ms}ms
      </span>

      {/* Queries · Earned */}
      <div className="col-span-3 hidden items-center justify-between gap-2 md:col-span-2 md:flex">
        <span className="font-mono text-[11px] text-foreground/70">
          {(queries / 1000).toFixed(1)}k · ${earned.toFixed(2)}
        </span>
        <ArrowUpRight01Icon
          size={12}
          strokeWidth={1.5}
          className="text-muted opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      </div>
    </div>
  );
}
