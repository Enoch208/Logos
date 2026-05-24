import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Marketplace", href: "/dashboard" },
  { label: "Infrastructure", href: "#infrastructure" },
  { label: "Atlas", href: "#atlas" },
  { label: "Specialists", href: "#specialists" },
  { label: "Docs", href: "#docs" },
] as const;

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link
          href="/"
          className="group flex cursor-pointer items-center gap-2.5 transition-colors"
        >
          <Image
            src="/logo.png"
            alt="Logos"
            width={28}
            height={28}
            priority
            className="rounded-md"
          />
          <span className="font-sans text-[15px] font-medium tracking-tight text-foreground">
            Logos
          </span>
          <span className="hidden md:inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Testnet
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-muted">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="cursor-pointer transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Enoch208/Logos"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden cursor-pointer text-sm text-muted transition-colors hover:text-foreground sm:block"
          >
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="cursor-pointer rounded-full bg-foreground px-4 py-2 text-sm font-medium text-black transition-all duration-200 ease-out hover:bg-foreground/90 active:scale-[0.98]"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
