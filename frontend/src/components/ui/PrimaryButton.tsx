import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

type CommonProps = {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "children" | "className"> & {
    href?: undefined;
  };

type LinkProps = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
};

type Props = ButtonProps | LinkProps;

const SHELL =
  "relative cursor-pointer overflow-hidden rounded-full bg-gradient-to-r from-[#FFEBB1] to-[#FFC438] px-7 py-3.5 text-sm font-medium text-amber-950 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2";
const SHADOW = {
  boxShadow:
    "rgba(255, 162, 42, 0.55) 0px 12px 28px -10px, rgb(252, 220, 134) 0px 3px 5px inset, rgb(255, 162, 38) 0px -4px 5px inset",
} as const;

function Inner({ children, trailing }: CommonProps) {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 translate-y-full bg-white/25 transition-transform duration-300 group-hover:translate-y-0"
      />
      <span className="relative flex items-center gap-2">
        {children}
        {trailing}
      </span>
    </>
  );
}

export function PrimaryButton(props: Props) {
  const { children, trailing, className = "" } = props;
  const shellClass = `${SHELL} ${className}`;
  return (
    <span className="relative inline-flex group">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 opacity-40 blur transition duration-500 group-hover:opacity-75 group-hover:blur-md"
      />
      {"href" in props && props.href ? (
        <Link
          href={props.href}
          target={props.target}
          rel={props.rel}
          className={shellClass}
          style={SHADOW}
        >
          <Inner trailing={trailing}>{children}</Inner>
        </Link>
      ) : (
        <button
          className={shellClass}
          style={SHADOW}
          {...(props as ButtonProps)}
        >
          <Inner trailing={trailing}>{children}</Inner>
        </button>
      )}
    </span>
  );
}
