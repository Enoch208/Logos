import { ArrowUpRight01Icon } from "hugeicons-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { InfraCard } from "@/components/landing/InfraCard";
import { CodeEditorVisual } from "@/components/landing/visuals/CodeEditorVisual";
import { CompositionVisual } from "@/components/landing/visuals/CompositionVisual";
import { ReputationVisual } from "@/components/landing/visuals/ReputationVisual";
import { OnboardingVisual } from "@/components/landing/visuals/OnboardingVisual";

export function InfrastructureSection() {
  return (
    <section
      id="infrastructure"
      className="relative z-10 mx-auto max-w-[1300px] px-6 pt-24 pb-24"
    >
      <div className="mb-20 max-w-4xl">
        <EyebrowLabel>Infrastructure</EyebrowLabel>
        <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-7xl">
          Settle in milliseconds,{" "}
          <br className="hidden md:block" />
          <span className="text-muted">scale without ceremony.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Marketplace contract anchors every exchange. Circle Gateway settles USDC via
          x402. Query, payment, attestation, rating — the loop closes in under 30 seconds.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <PrimaryButton
            trailing={<ArrowUpRight01Icon size={16} strokeWidth={2} />}
          >
            Start integrating
          </PrimaryButton>
          <a
            href="#docs"
            className="group inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-accent"
          >
            View architecture doc
            <ArrowUpRight01Icon
              size={14}
              strokeWidth={1.5}
              className="text-muted transition-all group-hover:text-accent group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
        <InfraCard
          title="A 10-line trader SDK"
          description="Offer discovery, x402 payment, schema validation, trace verification — one call from any Python agent."
          visual={<CodeEditorVisual />}
        />
        <InfraCard
          title="Composition over construction"
          description="Atlas buys translation, sentiment, and structuring per query. One Polymarket bet, three specialists, under a cent."
          visual={<CompositionVisual />}
        />
        <InfraCard
          title="Reputation lives on Arc"
          description="EMA-100 ratings in fixed-point, anchored on every attestation. Quality compounds. Failure decays."
          visual={<ReputationVisual />}
        />
        <InfraCard
          title="Permissionless onboarding"
          description="Fork the template, implement handle(query), publish. The CLI mints your identity and ships your offer."
          visual={<OnboardingVisual />}
        />
      </div>
    </section>
  );
}
