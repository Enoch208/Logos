import Image from "next/image";
import Link from "next/link";
import { Github01Icon, NewTwitterIcon } from "hugeicons-react";
import { LiveDot } from "@/components/ui/LiveDot";

const REPO = "https://github.com/Enoch208/Logos";
const DOCS = "https://test-998.gitbook.io/uselogos";

const COLUMNS = [
  {
    title: "Marketplace",
    items: [
      { label: "Specialists", href: "/dashboard/specialists" },
      { label: "Live transactions", href: "/dashboard" },
      { label: "Reputation", href: "/dashboard/leaderboard" },
      { label: "Trace explorer", href: "/dashboard/trace" },
    ],
  },
  {
    title: "Build",
    items: [
      { label: "Trader SDK · pip", href: "https://pypi.org/project/logos-arc/" },
      { label: "Quickstart", href: `${DOCS}/quickstart` },
      { label: "Contracts", href: `${REPO}/tree/main/contracts` },
      { label: "Primitives", href: `${DOCS}/primitives` },
    ],
  },
  {
    title: "Docs",
    items: [
      { label: "Concepts", href: `${DOCS}/concepts` },
      { label: "Settlement", href: `${DOCS}/settlement` },
      { label: "Live on Arc", href: `${DOCS}/deployment` },
      { label: "Source", href: REPO },
    ],
  },
  {
    title: "Hackathon",
    items: [
      { label: "Arc explorer", href: "https://testnet.arcscan.app" },
      { label: "Arc docs", href: "https://docs.arc.io" },
      { label: "Circle", href: "https://www.circle.com" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-white/5 pt-24 pb-12">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[400px] w-[1000px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]"
      />
      <div className="mx-auto grid max-w-[1300px] grid-cols-2 gap-x-8 gap-y-12 px-6 md:grid-cols-12">
        <div className="col-span-2 md:col-span-4">
          <Link href="/" className="flex cursor-pointer items-center gap-2.5">
            <Image src="/logo.png" alt="Logos" width={28} height={28} className="rounded-md" />
            <span className="text-[15px] font-medium tracking-tight text-foreground">Logos</span>
          </Link>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">
            A permissionless market for agent cognition. Built for the Agora Agents Hackathon —
            Canteen × Circle × Arc.
          </p>
          <div className="mt-6 flex items-center gap-3 text-muted">
            <a href="https://x.com/UseLogos" target="_blank" rel="noopener noreferrer" aria-label="X" className="cursor-pointer transition-colors hover:text-foreground">
              <NewTwitterIcon size={16} strokeWidth={1.5} />
            </a>
            <a href="https://github.com/Enoch208/Logos" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="cursor-pointer transition-colors hover:text-foreground">
              <Github01Icon size={16} strokeWidth={1.5} />
            </a>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="col-span-1 md:col-span-2">
            <h4 className="mb-4 text-sm font-medium text-foreground">{col.title}</h4>
            <ul className="space-y-3 text-sm">
              {col.items.map((item) => (
                <li key={item.label}>
                  {item.href.startsWith("/") ? (
                    <Link
                      href={item.href}
                      className="cursor-pointer text-muted transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-muted transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-16 flex max-w-[1300px] flex-col items-center justify-between gap-4 border-t border-white/5 px-6 pt-8 md:flex-row">
        <p className="font-mono text-[11px] text-muted">
          © 2026 Logos · Arc testnet · {`{}=>{}`}
        </p>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <LiveDot />
          marketplace online · indexer healthy
        </div>
      </div>
    </footer>
  );
}
