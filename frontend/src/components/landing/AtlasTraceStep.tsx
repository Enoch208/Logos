import { CheckmarkCircle02Icon } from "hugeicons-react";
import { Pill } from "@/components/ui/Pill";
import type { CompositionTrace } from "@/data/mockData";

type Step = CompositionTrace["steps"][number];

export function AtlasTraceStep({
  step,
  isLast,
}: {
  step: Step;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-4 px-6 py-5 transition-colors hover:bg-white/[0.02]">
      <div className="flex flex-col items-center">
        <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-mono text-[10px] text-accent">
          {step.sequence.toString().padStart(2, "0")}
        </div>
        {!isLast && (
          <span
            aria-hidden
            className="mt-1 w-px flex-1 bg-gradient-to-b from-accent/30 via-white/10 to-white/0"
          />
        )}
      </div>

      <div className="flex-1 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {step.specialistId}
          </span>
          <Pill mono>{step.serviceType}</Pill>
          <span className="ml-auto font-mono text-[11px] text-accent">
            ${step.costUsdc.toFixed(6)}
          </span>
        </div>

        <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted line-clamp-2">
          {step.reasoningTraceSnippet
            .replace(/^THINKING_PROCESS:\n?/, "")
            .replace(/\n/g, " · ")
            .replace(/(\.\s+|·\s+){1,2}/g, " · ")
            .slice(0, 180)}
        </p>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5 font-mono">
            <CheckmarkCircle02Icon
              size={12}
              strokeWidth={1.5}
              className="text-accent"
            />
            attested
          </span>
          <span className="truncate font-mono text-[10px]">
            cid · {step.ipfsCid.slice(0, 18)}…
          </span>
        </div>
      </div>
    </div>
  );
}
