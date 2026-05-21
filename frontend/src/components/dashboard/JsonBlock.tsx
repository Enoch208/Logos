type Props = {
  label: string;
  value: object;
  tone?: "input" | "output";
};

export function JsonBlock({ label, value, tone = "input" }: Props) {
  const json = JSON.stringify(value, null, 2);
  const accent =
    tone === "output"
      ? "border-accent/15 bg-accent/[0.03]"
      : "border-white/[0.05] bg-white/[0.015]";
  const labelColor = tone === "output" ? "text-accent" : "text-muted";
  return (
    <div className={`rounded-lg border ${accent}`}>
      <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-1.5">
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.2em] ${labelColor}`}
        >
          {label}
        </span>
        <span className="font-mono text-[9px] text-muted/70">JSON</span>
      </div>
      <pre className="max-h-44 overflow-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/85">
        {json}
      </pre>
    </div>
  );
}
