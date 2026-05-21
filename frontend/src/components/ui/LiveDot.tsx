type Props = {
  tone?: "accent" | "neutral";
};

export function LiveDot({ tone = "accent" }: Props) {
  const color = tone === "accent" ? "bg-accent" : "bg-foreground/70";
  return (
    <span className="relative inline-flex h-2 w-2 items-center justify-center">
      <span
        aria-hidden
        className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`}
      />
      <span
        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${color}`}
      />
    </span>
  );
}
