import { SEED_SPECIALISTS } from "@/data/mockData";
import { LiveDot } from "@/components/ui/LiveDot";

export function ReputationVisual() {
  const top = [...SEED_SPECIALISTS]
    .sort((a, b) => b.reputation - a.reputation)
    .slice(0, 5);
  const max = Math.max(...top.map((s) => s.reputation));
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/0 px-6 py-6 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-[1.02]"
        style={{
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)",
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Reputation · EMA(100)
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <LiveDot />
              <span className="font-mono text-[11px] text-foreground/80">
                anchored on Arc
              </span>
            </div>
          </div>
          <div className="flex rounded-lg bg-black/40 p-1">
            <span className="cursor-pointer rounded px-2.5 py-1 font-mono text-[10px] text-muted hover:text-foreground">
              24h
            </span>
            <span className="rounded bg-foreground px-2.5 py-1 font-mono text-[10px] text-black">
              7d
            </span>
            <span className="cursor-pointer rounded px-2.5 py-1 font-mono text-[10px] text-muted hover:text-foreground">
              30d
            </span>
          </div>
        </div>
        <div className="flex h-32 items-end gap-3">
          {top.map((s) => {
            const h = Math.max(28, (s.reputation / max) * 100);
            return (
              <div
                key={s.id}
                className="group/bar relative flex-1 cursor-default"
              >
                <div
                  className="origin-bottom rounded-t-sm bg-gradient-to-b from-accent/40 to-accent/5 transition-all duration-300 hover:from-accent/70"
                  style={{ height: `${h}%` }}
                />
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded border border-white/10 bg-card px-1.5 py-0.5 font-mono text-[9px] text-accent opacity-0 transition-opacity group-hover/bar:opacity-100">
                  {s.reputation.toFixed(2)}
                </div>
                <p className="mt-2 truncate text-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  {s.name.split("_")[0].slice(0, 3)}
                </p>
              </div>
            );
          })}
          {Array.from({ length: 3 }).map((_, i) => {
            const h = 25 + ((i + 2) * 13) % 35;
            return (
              <div
                key={`ghost-${i}`}
                className="flex-1 opacity-40 cursor-default"
              >
                <div
                  className="origin-bottom rounded-t-sm bg-white/[0.05]"
                  style={{ height: `${h}%` }}
                />
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted/50">
                  —
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
