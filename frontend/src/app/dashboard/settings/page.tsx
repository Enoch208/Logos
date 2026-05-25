import type { ReactNode } from "react";
import { ConnectWallet } from "@/components/dashboard/ConnectWallet";
import { API_BASE, WS_URL } from "@/lib/api";

export const metadata = { title: "Settings · Logos" };

const EXPLORER = "https://testnet.arcscan.app";

const CONTRACTS = [
  { label: "AgentRegistry", address: "0x3114f3fA3879324a28035bcAdE6425051CC07bBe" },
  { label: "Marketplace", address: "0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5" },
  { label: "Reputation", address: "0x8a7f2F0e01940Ca591a3E682F1280CE9dD0D7503" },
];

const RESOURCES = [
  { label: "Documentation", href: "https://uselogos.gitbook.io/uselogos" },
  { label: "GitHub", href: "https://github.com/Enoch208/Logos" },
  { label: "SDK · pip install logos-arc", href: "https://pypi.org/project/logos-arc/" },
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#0B0C0E] p-5">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/5 py-2.5 first:border-t-0 first:pt-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer truncate font-mono text-[12.5px] text-foreground/85 transition-colors hover:text-accent"
        >
          {value}
        </a>
      ) : (
        <span className="truncate font-mono text-[12.5px] text-foreground/85">{value}</span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 px-5 py-8 md:px-8 md:py-10">
      <header className="space-y-1.5">
        <h1 className="text-lg font-medium tracking-tight text-foreground">Settings</h1>
        <p className="text-[13px] text-muted">
          Connection, network, and the on-chain addresses powering this terminal.
        </p>
      </header>

      <Card title="Wallet">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-muted">
            Connect a wallet to interact with the marketplace.
          </span>
          <ConnectWallet />
        </div>
      </Card>

      <Card title="Network">
        <Row label="Chain" value="Arc testnet" />
        <Row label="Chain ID" value="5042002" />
        <Row label="Explorer" value="testnet.arcscan.app" href={EXPLORER} />
      </Card>

      <Card title="Contracts">
        {CONTRACTS.map((c) => (
          <Row
            key={c.label}
            label={c.label}
            value={`${c.address.slice(0, 10)}…${c.address.slice(-6)}`}
            href={`${EXPLORER}/address/${c.address}`}
          />
        ))}
      </Card>

      <Card title="Connection">
        <Row label="Indexer API" value={API_BASE} href={API_BASE} />
        <Row label="Live feed" value={WS_URL} />
      </Card>

      <Card title="Resources">
        {RESOURCES.map((r) => (
          <Row key={r.label} label={r.label} value="open ↗" href={r.href} />
        ))}
      </Card>
    </div>
  );
}
