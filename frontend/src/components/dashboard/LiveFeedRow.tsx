"use client";

import { motion } from "framer-motion";
import {
  GlobalSearchIcon,
  ArrowRight01Icon,
  Copy01Icon,
} from "hugeicons-react";
import type { AgentTransaction } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatRelativeTime, shortenHex } from "@/lib/format";

type Props = {
  tx: AgentTransaction;
  nowMs: number;
};

function specialistName(specialistId: string): string {
  const match = specialistId.match(/\(([^)]+)\)/);
  return match ? match[1] : specialistId;
}

export function LiveFeedRow({ tx, nowMs }: Props) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/[0.04] px-4 py-2.5 transition-colors hover:bg-white/[0.02] md:grid-cols-[auto_1fr_1.4fr_auto_auto]"
    >
      <StatusBadge status={tx.status} />

      <div className="flex min-w-0 items-center gap-2">
        <span className="font-mono text-[11px] text-foreground/85">
          {shortenHex(tx.id, 8, 4)}
        </span>
        <Copy01Icon
          size={11}
          strokeWidth={1.5}
          className="cursor-pointer text-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      <div className="hidden min-w-0 items-center gap-2 text-[12px] md:flex">
        <span className="truncate font-mono text-muted">{tx.traderId}</span>
        <ArrowRight01Icon
          size={11}
          strokeWidth={1.5}
          className="shrink-0 text-muted/50"
        />
        <span className="truncate font-mono text-foreground/90">
          {specialistName(tx.specialistId)}
        </span>
      </div>

      <div className="flex items-baseline justify-end gap-1.5">
        <span className="font-mono text-[12px] text-foreground">
          ${tx.costUsdc.toFixed(6)}
        </span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted sm:inline">
          usdc
        </span>
      </div>

      <div className="flex items-center gap-2.5 pl-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted/80 sm:inline">
          {nowMs > 0 ? formatRelativeTime(tx.timestamp, nowMs) : "—"}
        </span>
        <a
          href={`#trace?cid=${tx.traceCid}`}
          aria-label="View trace"
          className="cursor-pointer rounded-sm border border-white/5 bg-white/[0.02] p-1 text-muted transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-foreground"
        >
          <GlobalSearchIcon size={11} strokeWidth={1.5} />
        </a>
      </div>
    </motion.li>
  );
}
