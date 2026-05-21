import { Sparkline } from "@/components/dashboard/Sparkline";

type Props = {
  label: string;
  value: string;
  unit?: string;
  delta?: { direction: "up" | "down"; text: string };
  spark?: number[];
  accent?: boolean;
};

export function CounterTile({
  label,
  value,
  unit,
  delta,
  spark,
  accent = false,
}: Props) {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-white/[0.04] bg-[#0B0C0E] p-5 transition-colors duration-200 hover:border-white/[0.08]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {label}
        </span>
        {delta && (
          <span
            className={`font-mono text-[10px] ${
              delta.direction === "up" ? "text-emerald-300/80" : "text-rose-300/80"
            }`}
          >
            {delta.direction === "up" ? "↑" : "↓"} {delta.text}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-mono text-[30px] leading-none tracking-tight ${
              accent ? "text-accent" : "text-foreground"
            }`}
          >
            {value}
          </span>
          {unit && (
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted/70">
              {unit}
            </span>
          )}
        </div>
        {spark && (
          <span
            className={`shrink-0 ${
              accent ? "text-accent/70" : "text-foreground/40"
            }`}
          >
            <Sparkline values={spark} width={72} height={24} />
          </span>
        )}
      </div>
    </div>
  );
}
