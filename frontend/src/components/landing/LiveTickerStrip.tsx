"use client";

import {
  RECENT_TRANSACTIONS,
  type AgentTransaction,
} from "@/data/mockData";

const STATUS_DOT: Record<AgentTransaction["status"], string> = {
  ESCROWED: "bg-white/40",
  ATTESTED: "bg-white/70",
  RATED: "bg-accent",
};

const FEED = [...RECENT_TRANSACTIONS, ...RECENT_TRANSACTIONS, ...RECENT_TRANSACTIONS];

export function LiveTickerStrip() {
  return (
    <div
      className="group relative mt-14 overflow-hidden border-y border-white/[0.06] bg-canvas/40 py-3 backdrop-blur-sm md:-mt-6"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        maskImage:
          "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div
        className="flex w-max gap-10 whitespace-nowrap font-mono text-[11px] [animation:logos-marquee_46s_linear_infinite] group-hover:[animation-play-state:paused]"
      >
        {FEED.map((tx, i) => (
          <Chip key={`${tx.id}-${i}`} tx={tx} />
        ))}
      </div>
    </div>
  );
}

function Chip({ tx }: { tx: AgentTransaction }) {
  const specialist =
    tx.specialistId.split(" ")[1]?.replace(/[()]/g, "") ?? tx.specialistId;
  return (
    <div className="flex items-center gap-3 text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[tx.status]}`} />
      <span className="text-foreground/80">{tx.traderId.replace("0x_", "")}</span>
      <span className="text-muted/70">→</span>
      <span className="text-foreground/70">{specialist}</span>
      <span className="text-muted/60">·</span>
      <span className="text-foreground/80">${tx.costUsdc.toFixed(6)}</span>
      <span className="text-muted/60">·</span>
      <span
        className={
          tx.status === "RATED"
            ? "uppercase tracking-[0.14em] text-accent"
            : "uppercase tracking-[0.14em] text-muted"
        }
      >
        {tx.status}
      </span>
    </div>
  );
}
