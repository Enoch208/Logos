import Image from "next/image";
import {
  ArrowDown01Icon,
  PenTool01Icon,
  InboxIcon,
  Target02Icon,
  Layers01Icon,
  Package01Icon,
  AiBrain03Icon,
  CodeSquareIcon,
} from "hugeicons-react";

const NAV_ITEMS = [
  { icon: InboxIcon, label: "Inbox", badge: "4" },
  { icon: Target02Icon, label: "My Queries", badge: null },
  { icon: Layers01Icon, label: "Views", badge: null },
] as const;

const TEAMS = [
  { icon: Package01Icon, label: "Marketplace", iconClass: "text-amber-400", active: true },
  { icon: AiBrain03Icon, label: "Atlas", iconClass: "text-blue-400", active: false },
  { icon: CodeSquareIcon, label: "Trace Explorer", iconClass: "text-amber-500", active: false },
] as const;

export function DashboardSidebar() {
  return (
    <div className="flex h-full flex-col bg-[#0F1012]">
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.05] px-4">
        <Image src="/logo.png" alt="Logos" width={22} height={22} className="rounded-[4px]" />
        <span className="text-[13px] font-medium text-foreground/95">Logos</span>
        <span className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          testnet
        </span>
        <ArrowDown01Icon size={12} strokeWidth={1.5} className="ml-auto text-muted" />
      </div>

      <div className="space-y-1 p-3">
        <button className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-white/[0.05] bg-white/[0.05] px-3 py-2 text-[13px] text-foreground/90 transition-colors hover:bg-white/[0.08]">
          <PenTool01Icon size={14} strokeWidth={1.5} className="text-accent" />
          <span>Compose query</span>
          <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            C
          </span>
        </button>
      </div>

      <div className="space-y-0.5 p-3 pt-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground/85"
          >
            <item.icon size={14} strokeWidth={1.5} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto font-mono text-[11px] text-muted/70">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-3 px-6 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted/60">
        Your specialists
      </p>
      <div className="space-y-0.5 p-3">
        {TEAMS.map((t) => (
          <button
            key={t.label}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${
              t.active
                ? "bg-white/[0.05] text-foreground/95"
                : "text-muted hover:bg-white/[0.04] hover:text-foreground/85"
            }`}
          >
            <t.icon size={14} strokeWidth={1.5} className={t.iconClass} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
