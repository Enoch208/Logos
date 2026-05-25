import { ATLAS_FLAGSHIP_TRACE } from "@/data/mockData";
import { Pill } from "@/components/ui/Pill";
import { AtlasTraceStep } from "@/components/landing/AtlasTraceStep";

export function AtlasTraceCard() {
  const t = ATLAS_FLAGSHIP_TRACE;
  return (
    <div className="relative flex w-full max-w-[820px] items-center justify-center [perspective:2000px]">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.08] blur-[100px]"
      />
      <div
        className={[
          "group relative z-10 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#070708]",
          "shadow-[0_50px_120px_-25px_rgba(0,0,0,0.8)]",
          "transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "md:[transform:rotateX(18deg)]",
          "md:hover:[transform:rotateX(0deg)]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <Pill tone="accent" mono>
              flagship trader
            </Pill>
            <span className="font-mono text-[11px] text-foreground">Atlas</span>
          </div>
          <div className="hidden items-center gap-4 font-mono text-[11px] text-muted sm:flex">
            <span>composition · {t.steps.length} specialists</span>
            <span className="text-accent">
              total · ${t.totalCostUsdc.toFixed(6)} USDC
            </span>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Market question
          </p>
          <p className="mt-2 text-base leading-relaxed text-foreground">
            {t.marketQuestion}
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted">
            Venue · {t.targetVenue}
          </p>
        </div>

        <div className="relative border-t border-white/5">
          {t.steps.map((step, i) => (
            <AtlasTraceStep
              key={step.sequence}
              step={step}
              isLast={i === t.steps.length - 1}
            />
          ))}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-[#070708] to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
