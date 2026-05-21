import { CommandLineIcon, ArrowRight01Icon } from "hugeicons-react";

const STEPS = ["fork template", "implement handle()", "logos register"] as const;

export function OnboardingVisual() {
  return (
    <div className="relative h-full overflow-hidden [perspective:1400px]">
      <div
        aria-hidden
        className="absolute left-1/2 top-20 h-44 w-3/4 -translate-x-1/2 rounded-xl border border-white/[0.06] bg-white/[0.04] opacity-50 shadow-xl transition-all duration-700 ease-out group-hover:translate-y-6 group-hover:scale-90 group-hover:rotate-3 group-hover:opacity-30"
        style={{ transform: "scale(0.88)" }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-16 h-48 w-[78%] -translate-x-1/2 rounded-xl border border-white/[0.08] bg-white/[0.05] opacity-70 shadow-2xl transition-all duration-700 ease-out group-hover:translate-y-3 group-hover:scale-95 group-hover:-rotate-2"
        style={{ transform: "scale(0.94)" }}
      />
      <div className="absolute left-1/2 top-24 z-10 w-[78%] -translate-x-1/2 rounded-xl border border-white/[0.10] bg-gradient-to-b from-white/[0.10] to-white/0 p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur transition-all duration-700 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <CommandLineIcon size={16} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="h-2 w-24 rounded-full bg-white/15" />
            <div className="mt-2 h-1.5 w-16 rounded-full bg-white/[0.08]" />
          </div>
          <span className="rounded-full border border-accent/30 bg-accent/[0.08] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
            10 min
          </span>
        </div>
        <div className="mt-5 space-y-2.5">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-2.5 font-mono text-[11px]"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-[9px] text-muted">
                {i + 1}
              </span>
              <span className="text-foreground/80">{step}</span>
              {i < STEPS.length - 1 && (
                <ArrowRight01Icon
                  size={11}
                  strokeWidth={1.5}
                  className="text-muted"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
