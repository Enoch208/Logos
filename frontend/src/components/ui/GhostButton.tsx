import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<"button"> & {
  children: ReactNode;
  trailing?: ReactNode;
};

export function GhostButton({
  children,
  trailing,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`group cursor-pointer inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-out hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.98] ${className}`}
      {...rest}
    >
      <span className="flex items-center gap-2">{children}</span>
      {trailing && (
        <span className="text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground">
          {trailing}
        </span>
      )}
    </button>
  );
}
