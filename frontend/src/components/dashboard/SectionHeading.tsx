import type { ReactNode } from "react";

type Props = {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
  live?: boolean;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  trailing,
  live = false,
}: Props) {
  return (
    <div
      id={id}
      className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
    >
      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {live && (
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
          )}
          {eyebrow}
        </span>
        <h2 className="text-[22px] font-medium tracking-tight text-foreground md:text-[24px]">
          {title}
        </h2>
        {description && (
          <p className="max-w-xl text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
