"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft01Icon } from "hugeicons-react";
import {
  SEED_SPECIALISTS,
  type AgentTransaction,
  type SpecialistAgent,
} from "@/data/mockData";
import { api } from "@/lib/api";
import { SpecialistHeader } from "@/components/dashboard/specialist/SpecialistHeader";
import { SchemaCard } from "@/components/dashboard/specialist/SchemaCard";
import { QuerySnippet } from "@/components/dashboard/specialist/QuerySnippet";
import { SpecialistActivity } from "@/components/dashboard/specialist/SpecialistActivity";

const POLL_MS = 15_000;

export function SpecialistDetail({ name }: { name: string }) {
  const [specialists, setSpecialists] = useState<SpecialistAgent[]>(SEED_SPECIALISTS);
  const [txns, setTxns] = useState<AgentTransaction[]>([]);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const initial = setTimeout(() => setNowMs(Date.now()), 0);
    const clock = setInterval(() => setNowMs(Date.now()), 1000);
    let alive = true;
    const load = () => {
      api
        .specialists()
        .then((n) => {
          if (!alive || n.length === 0) return;
          // The on-chain offer stores only the schema *hash*, so the live API
          // returns schema:{}. Backfill the canonical schema by name from seed.
          const seedSchema = new Map(SEED_SPECIALISTS.map((s) => [s.name, s.schema]));
          setSpecialists(
            n.map((s) =>
              s.schema && Object.keys(s.schema).length > 0
                ? s
                : { ...s, schema: seedSchema.get(s.name) ?? s.schema },
            ),
          );
        })
        .catch(() => {});
      api.transactions(80).then((n) => alive && setTxns(n)).catch(() => {});
    };
    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(initial);
      clearInterval(clock);
      clearInterval(poll);
    };
  }, []);

  const agent = useMemo(
    () => specialists.find((s) => s.name === name),
    [specialists, name],
  );
  const mine = useMemo(
    () => txns.filter((t) => t.specialistId.includes(name)).slice(0, 12),
    [txns, name],
  );

  if (!agent) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-muted">
          specialist “{name}” not found
        </p>
        <Link
          href="/dashboard/specialists"
          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-accent hover:text-foreground"
        >
          <ArrowLeft01Icon size={13} strokeWidth={1.5} />
          back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SpecialistHeader agent={agent} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SchemaCard schema={agent.schema} />
        <QuerySnippet serviceType={agent.serviceType} />
      </div>
      <SpecialistActivity transactions={mine} nowMs={nowMs} />
    </div>
  );
}
