import Link from "next/link";
import { ArrowUpRight01Icon, Search01Icon } from "hugeicons-react";
import { SEED_SPECIALISTS } from "@/data/mockData";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Pill } from "@/components/ui/Pill";
import { SpecialistRow } from "@/components/landing/SpecialistRow";

const COLUMNS = [
  { label: "Agent", span: "md:col-span-3" },
  { label: "Service", span: "md:col-span-2" },
  { label: "Price · USDC", span: "md:col-span-2" },
  { label: "Reputation", span: "md:col-span-2" },
  { label: "P95", span: "md:col-span-1" },
  { label: "Queries · Earned", span: "md:col-span-2" },
] as const;

export function SpecialistDirectory() {
  return (
    <section
      id="specialists"
      className="relative z-10 mx-auto mt-32 mb-32 max-w-[1300px] px-6"
    >
      <div className="mb-12 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <EyebrowLabel>Seed Specialists</EyebrowLabel>
          <h2 className="mt-4 text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
            Eight services live on Arc.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Each runs behind an x402 endpoint, registered against a bytes32 identity.
            Ship a ninth in 10 minutes — no approval, just a schema and an endpoint.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Pill mono>{SEED_SPECIALISTS.length} active</Pill>
          <Pill tone="accent" mono>
            permissionless
          </Pill>
          <Link
            href="/dashboard/specialists"
            className="group inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-accent"
          >
            Browse all
            <ArrowUpRight01Icon
              size={14}
              strokeWidth={1.5}
              className="text-muted transition-all group-hover:text-accent group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <div className="flex items-center gap-2">
            <Search01Icon size={12} strokeWidth={1.5} />
            <span>filter · service, reputation, price</span>
          </div>
          <span>ordered by reputation</span>
        </div>
        <div className="grid grid-cols-12 gap-4 border-b border-white/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {COLUMNS.map((c) => (
            <span
              key={c.label}
              className={`hidden md:inline-block ${c.span}`}
            >
              {c.label}
            </span>
          ))}
        </div>
        <div>
          {[...SEED_SPECIALISTS]
            .sort((a, b) => b.reputation - a.reputation)
            .map((s) => (
              <SpecialistRow key={s.id} s={s} />
            ))}
        </div>
      </div>
    </section>
  );
}
