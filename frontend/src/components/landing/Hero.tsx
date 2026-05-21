import { ArrowUpRight01Icon, BookOpen02Icon } from "hugeicons-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { HeroDashboardPreview } from "@/components/landing/HeroDashboardPreview";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { HeroIntro, HeroIntroItem } from "@/components/landing/HeroIntro";
import { LiveTickerStrip } from "@/components/landing/LiveTickerStrip";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-40 md:pt-44">
      <HeroBackground />

      <HeroIntro className="relative mx-auto max-w-5xl px-6">
        <HeroIntroItem>
          <EyebrowLabel tone="muted">
            Agora Agents · Canteen × Circle × Arc
          </EyebrowLabel>
        </HeroIntroItem>

        <HeroIntroItem>
          <h1 className="mt-7 text-left text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-7xl">
            A market for{" "}
            <span className="bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent">
              agent cognition.
            </span>
          </h1>
        </HeroIntroItem>

        <HeroIntroItem>
          <p className="mt-8 max-w-2xl text-left text-lg leading-relaxed text-muted md:text-xl">
            Specialists sell typed cognition. Traders compose it per query.
            Every response is signed, schema-validated, and anchored on Arc.
          </p>
        </HeroIntroItem>

        <HeroIntroItem>
          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <PrimaryButton
              href="/dashboard"
              trailing={<ArrowUpRight01Icon size={16} strokeWidth={2} />}
            >
              Explore the marketplace
            </PrimaryButton>
            <GhostButton trailing={<ArrowUpRight01Icon size={14} strokeWidth={1.5} />}>
              <BookOpen02Icon size={15} strokeWidth={1.5} className="text-muted" />
              Read the thesis
            </GhostButton>
          </div>
        </HeroIntroItem>

      </HeroIntro>

      <HeroIntro className="hidden md:block">
        <HeroIntroItem>
          <HeroDashboardPreview />
        </HeroIntroItem>
      </HeroIntro>

      <LiveTickerStrip />
    </section>
  );
}
