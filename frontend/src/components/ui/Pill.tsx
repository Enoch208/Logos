import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "neutral" | "accent" | "outline";
  mono?: boolean;
  className?: string;
};

export function Pill({
  children,
  tone = "neutral",
  mono = false,
  className = "",
}: Props) {
  const tones = {
    neutral:
      "border-white/10 bg-white/[0.04] text-foreground/80",
    accent:
      "border-accent/25 bg-accent/[0.08] text-accent",
    outline:
      "border-white/5 bg-transparent text-muted",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${tones[tone]} ${mono ? "font-mono" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
