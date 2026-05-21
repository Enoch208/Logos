import { GhostButton } from "@/components/ui/GhostButton";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { AtlasTraceCard } from "@/components/landing/AtlasTraceCard";
import { ArrowUpRight01Icon } from "hugeicons-react";

const PILLARS = [
  {
    label: "Coasean",
    title: "The agent firm shrinks when the market exists",
    body:
      "Once cognition has a price, monolithic agents should buy best-of-breed pieces — not in-house them. Atlas is thin on purpose: procurement, not a brain.",
  },
  {
    label: "Settlement",
    title: "Three signed responses, one composed bet",
    body:
      "Each specialist settles in milliseconds via Circle Nanopayments. The full composition trace is hashed and anchored on Arc — verifiable from CID alone.",
  },
] as const;

export function AtlasSection() {
  return (
    <section
      id="atlas"
      className="relative z-10 mx-auto mt-32 mb-32 max-w-[1300px] px-6"
    >
      <div className="mb-20 max-w-4xl">
        <EyebrowLabel tone="accent">Flagship Trader · Atlas</EyebrowLabel>
        <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-7xl">
          Composition over{" "}
          <span className="text-muted">construction.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Atlas wins on Polymarket V2 by buying cognition, not building it. Three
          specialists handle translation, sentiment, structuring. One trade, under a cent.
        </p>
        <div className="mt-8 inline-flex">
          <GhostButton
            trailing={
              <ArrowUpRight01Icon size={14} strokeWidth={1.5} />
            }
          >
            See Atlas live
          </GhostButton>
        </div>
      </div>

      <div className="mx-auto flex justify-center">
        <AtlasTraceCard />
      </div>

      <div className="mt-24 grid grid-cols-1 gap-12 border-t border-white/5 pt-16 md:grid-cols-2">
        {PILLARS.map((p) => (
          <div key={p.label}>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
              {p.label}
            </p>
            <h3 className="mt-3 text-2xl font-medium tracking-tight text-foreground">
              {p.title}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
