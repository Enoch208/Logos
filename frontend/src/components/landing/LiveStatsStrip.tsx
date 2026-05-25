"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight01Icon } from "hugeicons-react";
import { api } from "@/lib/api";
import { MARKETPLACE_SUMMARY, type MarketplaceSummary } from "@/data/mockData";
import { formatNumberFull, formatUsdcCompact } from "@/lib/format";

const POLL_MS = 15_000;
const EXPLORER = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? "https://testnet.arcscan.app";
const MARKETPLACE = "0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5";

export function LiveStatsStrip() {
  // Real settled counts from the indexer (which reads the Marketplace contract).
  // Seed renders on the server, live numbers take over on mount.
  const [s, setS] = useState<MarketplaceSummary>(MARKETPLACE_SUMMARY);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .summary()
        .then((next) => alive && setS(next))
        .catch(() => {});
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // External wallets — distinct traders that aren't Atlas / our own fleet — are
  // the adoption signal, so they headline (amber) the moment the first one lands.
  const hasExternal = s.externalWallets > 0;
  const tiles: { value: string; label: string; accent?: boolean }[] = [
    { value: formatNumberFull(s.totalQueriesAllTime), label: "queries settled" },
  ];
  if (hasExternal) {
    tiles.push({
      value: formatNumberFull(s.externalWallets),
      label: s.externalWallets === 1 ? "external wallet" : "external wallets",
      accent: true,
    });
  }
  tiles.push({
    value: formatUsdcCompact(s.cumulativeVolumeUsdc),
    label: "USDC paid",
    accent: !hasExternal,
  });
  tiles.push({ value: formatNumberFull(s.tracesAnchored), label: "traces anchored" });

  return (
    <section className="mx-auto mt-24 flex max-w-3xl flex-col items-center px-6 text-center">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60"
          />
        </span>
        Live on Arc testnet · settled, not seeded
      </div>

      <h2 className="mt-4 text-2xl font-light tracking-tighter text-foreground sm:text-3xl">
        Real volume, verifiable on-chain.
      </h2>

      <div
        className={`mt-8 grid w-full divide-x divide-white/[0.06] rounded-xl border border-white/[0.06] bg-card/40 ${
          tiles.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        }`}
      >
        {tiles.map((t) => (
          <Stat key={t.label} value={t.value} label={t.label} accent={t.accent} />
        ))}
      </div>

      <a
        href={`${EXPLORER}/address/${MARKETPLACE}`}
        target="_blank"
        rel="noreferrer"
        className="group mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-muted transition-colors duration-200 hover:text-foreground"
      >
        verify on-chain — Marketplace {MARKETPLACE.slice(0, 6)}…{MARKETPLACE.slice(-4)}
        <ArrowUpRight01Icon
          size={12}
          strokeWidth={1.5}
          className="transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
        />
      </a>
    </section>
  );
}

function Stat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-5 sm:px-5">
      <div
        className={`font-mono text-2xl font-medium tracking-tight tabular-nums sm:text-3xl md:text-4xl ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
    </div>
  );
}
