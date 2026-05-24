import { AiBrain03Icon, ArrowUpRight01Icon } from "hugeicons-react";
import { ATLAS_FLAGSHIP_TRACE } from "@/data/mockData";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { AtlasStep } from "@/components/dashboard/AtlasStep";

export function AtlasPanel() {
  const trace = ATLAS_FLAGSHIP_TRACE;
  return (
    <section
      id="atlas"
      className="overflow-hidden rounded-xl border border-white/5 bg-[#0B0C0E]"
    >
      <div className="border-b border-white/5 px-5 pt-5">
        <SectionHeading
          eyebrow="Atlas · flagship trader"
          title="Current composition"
          trailing={
            <span className="hidden items-center gap-2 rounded-md border border-accent/25 bg-accent/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent md:inline-flex">
              <AiBrain03Icon size={13} strokeWidth={1.5} />
              Live
            </span>
          }
        />
      </div>

      <div className="flex flex-col gap-4 border-b border-white/5 px-5 py-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[14.5px] leading-snug text-foreground/95">
            {trace.marketQuestion}
          </p>
          <p className="font-mono text-[11px] text-muted">
            Venue · <span className="text-foreground/80">{trace.targetVenue}</span>
          </p>
        </div>

        <div className="flex items-center gap-5 md:shrink-0">
          <div className="text-right">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
              Cognition
            </span>
            <p className="font-mono text-[15px] text-accent">
              ${trace.totalCostUsdc.toFixed(6)}
            </p>
          </div>
          <a
            href="/dashboard/trace"
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-foreground transition-colors duration-200 ease-out hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.98]"
          >
            Verify traces
            <ArrowUpRight01Icon
              size={11}
              strokeWidth={1.5}
              className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
            />
          </a>
        </div>
      </div>

      {trace.decisions && trace.decisions.length > 0 && (
        <div className="border-b border-white/5 px-5 py-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            Decisions · procurement, not execution
          </span>
          <ul className="mt-2.5 space-y-1.5">
            {trace.decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] text-foreground/80">
                <span className="mt-0.5 font-mono text-[10px] text-accent">→</span>
                <span className="font-mono leading-snug">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="px-5 py-5">
        {trace.steps.map((step) => (
          <AtlasStep
            key={step.sequence}
            step={step}
            total={trace.steps.length}
          />
        ))}
      </ol>
    </section>
  );
}
