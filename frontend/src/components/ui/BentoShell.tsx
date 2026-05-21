import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  height?: string;
};

export function BentoShell({
  children,
  className = "",
  height = "h-[30rem]",
}: Props) {
  return (
    <div
      className={`relative ${height} overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.07] to-white/0 transition-all duration-500 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl p-px"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}
