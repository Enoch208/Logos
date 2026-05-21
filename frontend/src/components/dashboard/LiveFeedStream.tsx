"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { RECENT_TRANSACTIONS } from "@/data/mockData";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { LiveFeedRow } from "@/components/dashboard/LiveFeedRow";
import { useLiveFeed } from "@/lib/useLiveFeed";

const MAX_ROWS = 14;

const MODE_LABEL: Record<string, string> = {
  chain: "On-chain · Arc",
  mock: "Indexer · mock",
  "client-mock": "Offline · client mock",
};

export function LiveFeedStream() {
  const { rows, status, mode } = useLiveFeed(RECENT_TRANSACTIONS, MAX_ROWS);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const initial = setTimeout(() => setNowMs(Date.now()), 0);
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(tick);
    };
  }, []);

  const live = status === "open";

  return (
    <section id="live-feed" className="rounded-xl border border-white/5 bg-[#0B0C0E]">
      <div className="border-b border-white/5 px-5 pt-5">
        <SectionHeading
          eyebrow="Live transactions"
          title="Agent-to-agent stream"
          description="Every escrow, attestation, and rating on Arc testnet, in real time."
          live
          trailing={
            <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted md:inline-flex">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  live ? "bg-emerald-400" : "bg-amber-400"
                } animate-pulse`}
              />
              {MODE_LABEL[mode]}
            </span>
          }
        />
      </div>

      <div className="hidden grid-cols-[auto_1fr_1.4fr_auto_auto] gap-4 border-b border-white/5 bg-white/[0.015] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted md:grid">
        <span>Status</span>
        <span>Query ID</span>
        <span>Trader → Specialist</span>
        <span className="text-right">Cost</span>
        <span className="pl-3 text-right">Age</span>
      </div>

      <ul className="divide-y divide-white/[0.04]">
        <AnimatePresence initial={false}>
          {rows.map((tx) => (
            <LiveFeedRow key={tx.id} tx={tx} nowMs={nowMs} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
