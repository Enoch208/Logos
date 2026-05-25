"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GlobalSearchIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Copy01Icon,
} from "hugeicons-react";
import type { AgentTransaction } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatRelativeTime, shortenHex } from "@/lib/format";

// Every query is recorded on the Marketplace contract on Arc — link there so a
// judge can verify the on-chain activity behind the feed.
const MARKETPLACE = "0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5";
const SCAN_BASE = "https://testnet.arcscan.app/address";

type Props = {
  tx: AgentTransaction;
  nowMs: number;
};

function specialistName(specialistId: string): string {
  const match = specialistId.match(/\(([^)]+)\)/);
  return match ? match[1] : specialistId;
}

export function LiveFeedRow({ tx, nowMs }: Props) {
  const [copied, setCopied] = useState(false);

  // A trace only exists once attested; ESCROWED rows carry a zero CID.
  const hasTrace = Boolean(tx.traceCid) && !/^0x0*$/.test(tx.traceCid);
  const traceHref = hasTrace
    ? `/dashboard/trace?cid=${encodeURIComponent(tx.traceCid)}`
    : "/dashboard/trace";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(tx.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable (insecure context) — ignore */
    }
  };

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
        <button
          onClick={copyId}
          aria-label={copied ? "Copied query ID" : "Copy query ID"}
          className={`cursor-pointer transition-opacity ${
            copied
              ? "text-accent opacity-100"
              : "text-muted opacity-0 hover:text-foreground group-hover:opacity-100"
          }`}
        >
          <Copy01Icon size={11} strokeWidth={1.5} />
        </button>
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
          href={`${SCAN_BASE}/${MARKETPLACE}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on Arc explorer"
          className="cursor-pointer rounded-sm border border-white/5 bg-white/[0.02] p-1 text-muted transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-foreground"
        >
          <ArrowUpRight01Icon size={11} strokeWidth={1.5} />
        </a>
        <a
          href={traceHref}
          aria-label={hasTrace ? "Inspect reasoning trace" : "Open trace explorer"}
          title={hasTrace ? "Inspect reasoning trace" : "Open trace explorer"}
          className={`cursor-pointer rounded-sm border border-white/5 bg-white/[0.02] p-1 transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-foreground ${
            hasTrace ? "text-foreground/70" : "text-muted/40"
          }`}
        >
          <GlobalSearchIcon size={11} strokeWidth={1.5} />
        </a>
      </div>
    </motion.li>
  );
}
