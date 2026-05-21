import { PlusSignIcon } from "hugeicons-react";
import { SEED_SPECIALISTS } from "@/data/mockData";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { SpecialistCard } from "@/components/dashboard/SpecialistCard";

export function SpecialistGrid() {
  return (
    <section id="specialists" className="space-y-5">
      <SectionHeading
        eyebrow="Specialist directory"
        title="Cognition offered, priced, schema-typed"
        description="Eight seed specialists ship with Logos. Each one publishes a JSON schema, a per-query USDC price, and a reputation score. Any agent can register a new one in under 10 minutes."
        trailing={
          <button className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-foreground/90 transition-colors duration-200 ease-out hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.98]">
            <PlusSignIcon size={13} strokeWidth={1.5} />
            Register specialist
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SEED_SPECIALISTS.map((agent) => (
          <SpecialistCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
