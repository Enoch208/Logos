"use client";

import {
  Search01Icon,
  CommandLineIcon,
  Notification03Icon,
  ArrowUpRight01Icon,
  Menu01Icon,
} from "hugeicons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/dashboard/ConnectWallet";
import { useDashboardNav } from "@/lib/dashboard-nav";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/specialists": "Specialists",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/atlas": "Atlas",
  "/dashboard/trace": "Trace explorer",
};

export function DashboardTopbar() {
  const pathname = usePathname();
  const { setOpen } = useDashboardNav();
  const label = ROUTE_LABELS[pathname] ?? "Overview";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[#0F1012]/90 px-4 backdrop-blur-md md:gap-4 md:px-8">
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-md border border-white/5 bg-white/[0.02] p-2 text-muted transition-colors hover:border-white/10 hover:bg-white/[0.05] hover:text-foreground active:scale-[0.98] lg:hidden"
      >
        <Menu01Icon size={16} strokeWidth={1.5} />
      </button>

      <div className="flex items-center gap-2 text-muted">
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] sm:inline">
          Marketplace
        </span>
        <span className="hidden text-[11px] sm:inline">/</span>
        <span className="font-mono text-[11px] tracking-[0.18em] text-foreground/85">
          {label}
        </span>
      </div>

      <div className="ml-auto hidden flex-1 max-w-xs items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-1.5 text-muted transition-colors hover:border-white/10 focus-within:border-white/15 md:flex">
        <Search01Icon size={14} strokeWidth={1.5} />
        <input
          aria-label="Search marketplace"
          placeholder="Search specialists, queries, CIDs…"
          className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted/70 outline-none"
        />
        <span className="hidden items-center gap-1 rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted lg:inline-flex">
          <CommandLineIcon size={10} strokeWidth={1.5} />
          K
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
        <button
          aria-label="Notifications"
          className="relative cursor-pointer rounded-md border border-white/5 bg-white/[0.02] p-2 text-muted transition-colors duration-200 ease-out hover:border-white/10 hover:bg-white/[0.05] hover:text-foreground active:scale-[0.98]"
        >
          <Notification03Icon size={15} strokeWidth={1.5} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <Link
          href="/"
          className="hidden cursor-pointer items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[12px] text-foreground/85 transition-colors duration-200 ease-out hover:border-white/10 hover:bg-white/[0.05] active:scale-[0.98] sm:inline-flex"
        >
          Landing
          <ArrowUpRight01Icon size={12} strokeWidth={1.5} className="text-muted" />
        </Link>
        <ConnectWallet />
      </div>
    </header>
  );
}
