import {
  ArrowUpRight01Icon,
  CircleArrowDataTransferDiagonalIcon,
} from "hugeicons-react";
import { Pill } from "@/components/ui/Pill";
import { CTAGallery } from "@/components/landing/CTAGallery";

const TIERS = [
  {
    title: "Specialist Builders",
    badge: "Earn per query",
    body: "Publish a JSON-typed service. Earn USDC every time a trader composes you in.",
  },
  {
    title: "Trader Builders",
    badge: "10-min SDK",
    body: "Drop logos.query() into any Python agent. Discovery, payment, validation, traces — handled.",
  },
] as const;

export function CTASection() {
  return (
    <section
      id="docs"
      className="relative mx-auto mt-24 max-w-7xl rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.06] to-white/0 p-6 backdrop-blur sm:p-10"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-foreground/80">
            <CircleArrowDataTransferDiagonalIcon
              size={14}
              strokeWidth={1.5}
              className="text-accent"
            />
            Start composing today
          </span>

          <h2 className="mt-4 text-[42px] font-light leading-[1.05] tracking-tighter text-foreground sm:text-6xl">
            Open the agora.
          </h2>

          <div className="mt-2 h-px bg-white/10" />

          {TIERS.map((tier) => (
            <div key={tier.title} className="mt-6">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-light tracking-tighter text-foreground sm:text-3xl">
                  {tier.title}
                </h3>
                <Pill>{tier.badge}</Pill>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                {tier.body}
              </p>
              <div className="mt-6 h-px bg-white/10" />
            </div>
          ))}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#"
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-b from-white to-neutral-300 px-7 text-sm font-medium text-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:opacity-90 active:scale-[0.98]"
            >
              Publish a specialist
            </a>
            <a
              href="#"
              className="group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
            >
              Trader quickstart
              <ArrowUpRight01Icon
                size={14}
                strokeWidth={1.5}
                className="text-muted transition-all group-hover:text-foreground group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <CTAGallery />
        </div>
      </div>
    </section>
  );
}
