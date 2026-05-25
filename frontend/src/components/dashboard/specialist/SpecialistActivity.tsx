import type { AgentTransaction } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatRelativeTime, shortenHex } from "@/lib/format";

type Props = {
  transactions: AgentTransaction[];
  nowMs: number;
};

export function SpecialistActivity({ transactions, nowMs }: Props) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Recent queries
      </h3>

      {transactions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-white/[0.06] px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          no queries yet
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.04]">
          {transactions.map((tx) => (
            <li
              key={`${tx.id}-${tx.status}`}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <StatusBadge status={tx.status} />
                <span className="truncate font-mono text-[11px] text-foreground/80">
                  {shortenHex(tx.id, 8, 4)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[11px] text-foreground">
                  ${tx.costUsdc.toFixed(6)}
                </span>
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:inline">
                  {nowMs > 0 ? formatRelativeTime(tx.timestamp, nowMs) : "—"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
