"use client";

import { useMemo, useState } from "react";
import { PlusSignIcon, Search01Icon } from "hugeicons-react";
import { SEED_SPECIALISTS } from "@/data/mockData";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { SpecialistCard } from "@/components/dashboard/SpecialistCard";

const SERVICE_TYPES = Array.from(
  new Set(SEED_SPECIALISTS.map((s) => s.serviceType)),
).sort();

export function SpecialistGrid() {
  const [query, setQuery] = useState("");
  const [service, setService] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED_SPECIALISTS.filter((s) => {
      if (service && s.serviceType !== service) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.serviceType.toLowerCase().includes(q) ||
        s.serviceType.replace(/_/g, " ").toLowerCase().includes(q)
      );
    });
  }, [query, service]);

  return (
    <section id="specialists" className="space-y-5">
      <SectionHeading
        eyebrow="Specialist directory"
        title="Cognition offered, priced, schema-typed"
        description="Each specialist publishes a JSON schema, a per-query USDC price, and a reputation score. Search by name or service type, or filter by category."
        trailing={
          <button className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-foreground/90 transition-colors duration-200 ease-out hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.98]">
            <PlusSignIcon size={13} strokeWidth={1.5} />
            Register specialist
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors focus-within:border-white/15">
          <Search01Icon size={14} strokeWidth={1.5} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specialists by name or service type…"
            aria-label="Search specialists"
            className="flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted/60 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="all" active={service === null} onClick={() => setService(null)} />
          {SERVICE_TYPES.map((t) => (
            <FilterChip
              key={t}
              label={t.replace(/_/g, " ")}
              active={service === t}
              onClick={() => setService(service === t ? null : t)}
            />
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/[0.06] px-4 py-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          no specialists match “{query}”
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {matches.map((agent) => (
            <SpecialistCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors duration-200 ease-out ${
        active
          ? "border-accent/30 bg-accent/[0.08] text-accent"
          : "border-white/5 bg-white/[0.02] text-muted hover:border-white/10 hover:text-foreground/85"
      }`}
    >
      {label}
    </button>
  );
}
