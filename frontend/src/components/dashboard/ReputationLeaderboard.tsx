"use client";

import { useMemo, useState } from "react";
import { SEED_SPECIALISTS } from "@/data/mockData";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { LeaderboardRow } from "@/components/dashboard/LeaderboardRow";

type Metric = "earned" | "reputation" | "queries";

const TABS: { id: Metric; label: string }[] = [
  { id: "earned", label: "Earned" },
  { id: "reputation", label: "Score" },
  { id: "queries", label: "Queries" },
];

export function ReputationLeaderboard() {
  const [metric, setMetric] = useState<Metric>("earned");

  const ranked = useMemo(() => {
    const copy = [...SEED_SPECIALISTS];
    copy.sort((a, b) => {
      if (metric === "earned")
        return b.metrics.totalEarnedUsdc - a.metrics.totalEarnedUsdc;
      if (metric === "queries")
        return b.metrics.queriesServed - a.metrics.queriesServed;
      return b.reputation - a.reputation;
    });
    return copy;
  }, [metric]);

  const max = useMemo(() => {
    if (metric === "earned")
      return Math.max(...ranked.map((r) => r.metrics.totalEarnedUsdc));
    if (metric === "queries")
      return Math.max(...ranked.map((r) => r.metrics.queriesServed));
    return Math.max(...ranked.map((r) => r.reputation));
  }, [ranked, metric]);

  return (
    <section id="leaderboard" className="rounded-xl border border-white/5 bg-[#0B0C0E]">
      <div className="border-b border-white/5 px-5 pt-5">
        <SectionHeading
          eyebrow="Reputation"
          title="Top specialists"
          trailing={
            <div className="inline-flex rounded-md border border-white/5 bg-white/[0.02] p-0.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMetric(t.id)}
                  className={`cursor-pointer rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 ease-out ${
                    metric === t.id
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted hover:text-foreground/85"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
        />
      </div>

      <ul>
        {ranked.map((agent, i) => (
          <LeaderboardRow
            key={agent.id}
            rank={i + 1}
            agent={agent}
            metric={metric}
            maxMetric={max}
          />
        ))}
      </ul>
    </section>
  );
}
