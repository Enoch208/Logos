import {
  FilterIcon,
  SortByDown01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  PauseIcon,
  AlertCircleIcon,
} from "hugeicons-react";
import type { ComponentType } from "react";

type IconCmp = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type StatusKind = "in-progress" | "done" | "queued" | "urgent";

const STATUS: Record<
  StatusKind,
  { icon: IconCmp; label: string; tint: string }
> = {
  "in-progress": { icon: Clock01Icon, label: "In progress", tint: "text-accent" },
  done: { icon: CheckmarkCircle02Icon, label: "Attested", tint: "text-yellow-500" },
  queued: { icon: PauseIcon, label: "Queued", tint: "text-muted" },
  urgent: { icon: AlertCircleIcon, label: "Urgent", tint: "text-accent" },
};

type Row = {
  id: string;
  title: string;
  status: StatusKind;
  priority?: string;
  active?: boolean;
  avatarTone: string;
};

const ROWS: Row[] = [
  {
    id: "QRY-4291",
    title: "Refactor PBoC LPR composition for Atlas",
    status: "in-progress",
    priority: "High priority",
    active: true,
    avatarTone: "from-amber-700/60 to-amber-500/60",
  },
  {
    id: "QRY-4290",
    title: "Update sentiment specialist schema to v2",
    status: "done",
    avatarTone: "from-zinc-700 to-zinc-600",
  },
  {
    id: "QRY-4289",
    title: "Migrate trace anchors to Arc testnet v2",
    status: "queued",
    avatarTone: "from-zinc-700 to-zinc-600",
  },
  {
    id: "QRY-4288",
    title: "Investigate latency spike on whale_tracker",
    status: "urgent",
    avatarTone: "from-amber-800/60 to-zinc-700",
  },
];

export function DashboardQueryRail() {
  return (
    <div className="flex h-full flex-col bg-[#0B0C0E]">
      <div className="flex h-14 items-center justify-between border-b border-white/[0.05] px-5">
        <span className="text-[13px] font-medium text-foreground/85">Marketplace</span>
        <div className="flex gap-3 text-muted/80">
          <FilterIcon size={14} strokeWidth={1.5} className="cursor-pointer hover:text-foreground/80" />
          <SortByDown01Icon size={14} strokeWidth={1.5} className="cursor-pointer hover:text-foreground/80" />
        </div>
      </div>

      <ul className="flex-1 overflow-hidden">
        {ROWS.map((row) => {
          const meta = STATUS[row.status];
          const Icon = meta.icon;
          return (
            <li
              key={row.id}
              className={`group flex cursor-pointer flex-col gap-1 border-b border-white/[0.05] p-4 transition-colors ${
                row.active
                  ? "border-l-2 border-l-accent bg-[#16181D]"
                  : "border-l-2 border-l-transparent hover:bg-[#131416]"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`font-mono text-[11px] ${row.active ? "text-accent" : "text-muted group-hover:text-foreground/60"}`}
                >
                  {row.id}
                </span>
                {row.priority && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted/60" />
                    <span className="text-[11px] text-muted">{row.priority}</span>
                  </>
                )}
              </div>
              <span
                className={`text-[13px] leading-snug ${
                  row.active
                    ? "font-medium text-foreground"
                    : "text-foreground/65 group-hover:text-foreground/95"
                }`}
              >
                {row.title}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Icon size={14} strokeWidth={1.5} className={meta.tint} />
                <span className="text-[11px] text-muted">{meta.label}</span>
                <span
                  className={`ml-auto h-5 w-5 rounded-full border border-black/40 bg-gradient-to-tr ${row.avatarTone}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
