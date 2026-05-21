import {
  Link01Icon,
  MoreHorizontalIcon,
  Clock01Icon,
  PenTool01Icon,
  UserIcon,
} from "hugeicons-react";
import { ATLAS_FLAGSHIP_TRACE } from "@/data/mockData";
import { DashboardCodeBlock } from "@/components/landing/dashboard/DashboardCodeBlock";
import { DashboardActivity } from "@/components/landing/dashboard/DashboardActivity";

const QUERY = ATLAS_FLAGSHIP_TRACE;

export function DashboardMainPanel() {
  return (
    <div className="relative flex h-full flex-col bg-[#0B0C0E]">
      <div className="flex h-14 items-center justify-between border-b border-white/[0.05] px-6">
        <div className="flex items-center gap-2 text-muted">
          <span className="font-mono text-[11px]">Marketplace</span>
          <span className="text-[11px]">/</span>
          <span className="font-mono text-[11px] text-foreground/80">QRY-4291</span>
        </div>
        <div className="flex gap-4 text-muted">
          <Link01Icon size={14} strokeWidth={1.5} className="cursor-pointer hover:text-foreground/80" />
          <MoreHorizontalIcon size={14} strokeWidth={1.5} className="cursor-pointer hover:text-foreground/80" />
        </div>
      </div>

      <div className="overflow-y-auto p-8">
        <h2 className="mb-4 text-2xl font-medium tracking-tight text-foreground">
          Atlas composition · PBoC LPR resolution
        </h2>

        <div className="mb-8 flex items-center gap-6 border-b border-white/[0.05] pb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <UserIcon size={11} strokeWidth={1.5} className="text-muted" />
            </div>
            <span className="text-[13px] text-muted">
              Composed by{" "}
              <span className="text-foreground/85">atlas_trader.eth</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock01Icon size={14} strokeWidth={1.5} className="text-accent" />
            <span className="text-[13px] text-muted">Settles in &lt; 30s</span>
          </div>
        </div>

        <div className="space-y-6 text-[14px] leading-relaxed text-foreground/75">
          <p>
            Atlas is pricing a Polymarket V2 bet on whether the PBoC will cut the
            1-Year LPR before May 25, 2026. Mandarin-source release detected on the
            PBoC site — translation specialist invoked at $0.000150 USDC.
          </p>

          <DashboardCodeBlock />

          <p>
            Translation handed off to <span className="text-foreground">twitter_sentiment</span>{" "}
            for context, then to <span className="text-foreground">polymarket_structurer</span>{" "}
            for the binary resolution. Total cost of cognition for one bet:{" "}
            <span className="font-mono text-accent">
              ${QUERY.totalCostUsdc.toFixed(6)}
            </span>{" "}
            USDC.
          </p>
        </div>

        <DashboardActivity />
      </div>

      <div className="absolute right-8 bottom-8">
        <button className="cursor-pointer rounded-full bg-foreground p-3 text-canvas shadow-lg shadow-white/10 transition-colors hover:bg-foreground/90">
          <PenTool01Icon size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
