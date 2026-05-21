"use client";

import { useState } from "react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Link01Icon,
} from "hugeicons-react";
import type { CompositionTrace } from "@/data/mockData";
import { JsonBlock } from "@/components/dashboard/JsonBlock";

type Props = {
  step: CompositionTrace["steps"][number];
  total: number;
};

export function AtlasStep({ step, total }: Props) {
  const [open, setOpen] = useState(step.sequence === 1);
  return (
    <li className="relative flex gap-4">
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.08] font-mono text-[12px] text-accent">
          {step.sequence}
        </span>
        {step.sequence !== total && (
          <span
            aria-hidden
            className="my-2 w-px flex-1 bg-gradient-to-b from-white/15 via-white/5 to-transparent"
          />
        )}
      </div>

      <div className="flex-1 pb-6">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-[#0B0C0E] px-4 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.02]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="truncate font-mono text-[12px] text-foreground">
              {step.specialistId}
            </span>
            <ArrowRight01Icon
              size={11}
              strokeWidth={1.5}
              className="shrink-0 text-muted/60"
            />
            <span className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              {step.serviceType.replace(/_/g, " ")}
            </span>
          </div>
          <span className="font-mono text-[12px] text-accent">
            ${step.costUsdc.toFixed(6)}
          </span>
          <ArrowDown01Icon
            size={13}
            strokeWidth={1.5}
            className={`shrink-0 text-muted transition-transform duration-200 ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {open && (
          <div className="mt-3 space-y-3 rounded-lg border border-white/5 bg-[#0B0C0E]/60 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <JsonBlock label="Input payload" value={step.inputPayload} />
              <JsonBlock
                label="Output response"
                value={step.outputResponse}
                tone="output"
              />
            </div>

            <div className="rounded-lg border border-white/[0.05] bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                  Reasoning trace · snippet
                </span>
                <Copy01Icon
                  size={11}
                  strokeWidth={1.5}
                  className="cursor-pointer text-muted hover:text-foreground"
                />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/75">
                {step.reasoningTraceSnippet}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <a
                href={`https://w3s.link/ipfs/${step.ipfsCid}`}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10.5px] text-muted transition-colors hover:text-foreground"
              >
                <Link01Icon size={11} strokeWidth={1.5} />
                ipfs://{step.ipfsCid.slice(0, 20)}…
              </a>
              <button className="cursor-pointer rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85 transition-colors hover:border-white/15 hover:bg-white/[0.08]">
                Verify on Arc
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
