import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<"button"> & {
  children: ReactNode;
  trailing?: ReactNode;
};

export function PrimaryButton({
  children,
  trailing,
  className = "",
  ...rest
}: Props) {
  return (
    <span className="relative inline-flex group">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 opacity-40 blur transition duration-500 group-hover:opacity-75 group-hover:blur-md"
      />
      <button
        className={`relative cursor-pointer overflow-hidden rounded-full bg-gradient-to-r from-[#FFEBB1] to-[#FFC438] px-7 py-3.5 text-sm font-medium text-amber-950 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] ${className}`}
        style={{
          boxShadow:
            "rgba(255, 162, 42, 0.55) 0px 12px 28px -10px, rgb(252, 220, 134) 0px 3px 5px inset, rgb(255, 162, 38) 0px -4px 5px inset",
        }}
        {...rest}
      >
        <span
          aria-hidden
          className="absolute inset-0 translate-y-full bg-white/25 transition-transform duration-300 group-hover:translate-y-0"
        />
        <span className="relative flex items-center gap-2">
          {children}
          {trailing}
        </span>
      </button>
    </span>
  );
}
