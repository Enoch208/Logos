const NODES = [
  { id: "mandarin", label: "MND", x: 9, y: 53 },
  { id: "twitter", label: "TWT", x: 26, y: 18 },
  { id: "structurer", label: "STR", x: 74, y: 18 },
  { id: "whale", label: "WHL", x: 91, y: 53 },
] as const;

export function CompositionVisual() {
  return (
    <div className="flex h-full items-center justify-center overflow-hidden px-8 pt-10">
      <div className="relative h-[260px] w-full max-w-[480px]">
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-full origin-bottom scale-[0.85] rounded-t-full border-t border-white/[0.05] transition-transform duration-[2000ms] ease-out group-hover:scale-100"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-full origin-bottom scale-95 rounded-t-full border-t border-white/[0.08] transition-transform duration-[2500ms] ease-out group-hover:scale-[1.05]"
        />
        <div
          aria-hidden
          className="absolute inset-x-[12%] bottom-0 h-3/4 origin-bottom scale-[0.85] rounded-t-full border-t border-white/[0.08] transition-transform duration-[1500ms] delay-100 ease-out group-hover:scale-100"
        />
        <div
          aria-hidden
          className="absolute inset-x-[28%] bottom-0 h-1/2 origin-bottom scale-95 rounded-t-full border-t border-white/[0.10] transition-transform duration-1000 delay-200 ease-out group-hover:scale-105"
        />

        {NODES.map((n) => (
          <div
            key={n.id}
            className="absolute flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-card transition-all duration-500 group-hover:scale-110 group-hover:border-white/25 group-hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted transition-colors group-hover:text-foreground">
              {n.label}
            </span>
          </div>
        ))}

        <div className="absolute left-1/2 -top-[6%] z-20 flex -translate-x-1/2 flex-col items-center transition-transform duration-500 group-hover:-translate-y-1.5">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#0a0a0c] bg-[#1a1a1c] shadow-xl transition-shadow duration-500 group-hover:shadow-[0_0_28px_rgba(245,158,11,0.25)]">
            <span className="font-mono text-[11px] font-medium tracking-tight text-foreground">
              Atlas
            </span>
            <span
              aria-hidden
              className="absolute inset-0 rounded-full ring-1 ring-inset ring-accent/30 transition-all duration-500 group-hover:ring-accent/60"
            />
          </div>
          <div className="mt-3 rounded-full border border-white/10 bg-card/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors group-hover:bg-white/[0.06]">
            trader · composing
          </div>
        </div>
      </div>
    </div>
  );
}
