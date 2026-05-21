type Props = {
  children: string;
  tone?: "muted" | "accent";
};

export function EyebrowLabel({ children, tone = "muted" }: Props) {
  const text = tone === "accent" ? "text-accent" : "text-foreground/60";
  const dot = tone === "accent" ? "bg-accent" : "bg-foreground/60";
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
      <span className={`relative inline-flex h-1.5 w-1.5 ${dot} rounded-full`}>
        <span
          aria-hidden
          className={`absolute inset-0 animate-ping rounded-full ${dot} opacity-50`}
        />
      </span>
      <span className={text}>{children}</span>
    </span>
  );
}
