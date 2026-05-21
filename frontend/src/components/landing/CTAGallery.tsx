import {
  CubeIcon,
  FlashIcon,
  CheckmarkBadge02Icon,
  AiBrain03Icon,
  ConnectIcon,
} from "hugeicons-react";
import type { ComponentType } from "react";

type Tone = "neutral" | "accent";
type Tile = {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  value: string;
  tone: Tone;
  tall?: boolean;
};

const TILES: Tile[] = [
  { icon: CubeIcon, label: "marketplace", value: "12 services", tone: "neutral" },
  { icon: FlashIcon, label: "p95 latency", value: "310ms", tone: "accent" },
  {
    icon: AiBrain03Icon,
    label: "atlas · live",
    value: "composing 3 specialists",
    tone: "neutral",
    tall: true,
  },
  { icon: ConnectIcon, label: "indexer", value: "healthy", tone: "neutral" },
  { icon: CheckmarkBadge02Icon, label: "traces", value: "1.2k anchored", tone: "neutral" },
];

export function CTAGallery() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div
        className="rounded-[24px] border border-white/10 bg-neutral-950/80 p-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]"
      >
        <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#070708]">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              logos · dashboard
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-5 md:grid-cols-3">
            {TILES.map(({ icon: Icon, label, value, tone, tall }) => (
              <div
                key={label}
                className={`group relative overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 p-4 transition-all duration-300 hover:border-white/15 hover:bg-card ${tall ? "md:row-span-2" : ""}`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={
                    tone === "accent" ? "text-accent" : "text-foreground/80"
                  }
                />
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  {label}
                </p>
                <p className="mt-1 text-sm text-foreground">{value}</p>
                {tall && (
                  <div className="mt-4 space-y-1.5">
                    {[
                      { name: "mandarin_macro", state: "rated" },
                      { name: "twitter_sentiment", state: "rated" },
                      { name: "polymarket_struct.", state: "attested" },
                    ].map((row) => (
                      <div
                        key={row.name}
                        className="flex items-center gap-2 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px]"
                      >
                        <span className="min-w-0 flex-1 truncate text-foreground/80">
                          {row.name}
                        </span>
                        <span
                          className={
                            row.state === "rated"
                              ? "shrink-0 text-accent"
                              : "shrink-0 text-foreground/60"
                          }
                        >
                          {row.state}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex h-1.5 items-center justify-center rounded-b-lg bg-gradient-to-b from-neutral-800 to-neutral-900">
          <div className="h-px w-[40%] bg-white/10" />
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-6 h-60 w-60 rounded-full bg-accent/[0.06] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl"
      />
    </div>
  );
}
