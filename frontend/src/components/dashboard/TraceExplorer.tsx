"use client";

import { useState } from "react";
import {
  Search01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
} from "hugeicons-react";
import { ATLAS_FLAGSHIP_TRACE } from "@/data/mockData";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { JsonBlock } from "@/components/dashboard/JsonBlock";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; cid: string; step: (typeof ATLAS_FLAGSHIP_TRACE.steps)[number] }
  | { kind: "miss"; cid: string };

const KNOWN: Record<string, (typeof ATLAS_FLAGSHIP_TRACE.steps)[number]> = {};
for (const s of ATLAS_FLAGSHIP_TRACE.steps) KNOWN[s.ipfsCid] = s;

const SAMPLE_CID = ATLAS_FLAGSHIP_TRACE.steps[0].ipfsCid;

export function TraceExplorer() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  function resolve(raw: string) {
    const cid = raw.replace(/^ipfs:\/\//, "").trim();
    if (!cid) return;
    setState({ kind: "loading" });
    setTimeout(() => {
      const hit = KNOWN[cid];
      setState(hit ? { kind: "ok", cid, step: hit } : { kind: "miss", cid });
    }, 420);
  }

  return (
    <section id="trace" className="rounded-xl border border-white/5 bg-[#0B0C0E]">
      <div className="border-b border-white/5 px-5 pt-5">
        <SectionHeading
          eyebrow="Trace explorer"
          title="Verify any reasoning trace by CID"
          description="Paste an IPFS CID emitted by a ResponseAttested event. We fetch the canonical-JSON trace from w3s.link, recompute the keccak256, and verify it against the on-chain anchor."
        />
      </div>

      <div className="space-y-3 border-b border-white/5 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors focus-within:border-white/15">
            <Search01Icon size={14} strokeWidth={1.5} className="text-muted" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") resolve(value);
              }}
              placeholder="bafybeicvxl3szg62ymznkuhc6yq46v7oht2k6mxmnhxtas7wzclwby3rzu"
              className="flex-1 bg-transparent font-mono text-[12px] text-foreground placeholder:text-muted/60 outline-none"
            />
          </div>
          <button
            onClick={() => resolve(value)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent px-5 py-2.5 text-[12.5px] font-medium text-black transition-all duration-200 ease-out hover:bg-accent/90 active:scale-[0.98]"
          >
            Resolve trace
            <ArrowRight01Icon size={12} strokeWidth={2} />
          </button>
        </div>
        <button
          onClick={() => {
            setValue(SAMPLE_CID);
            resolve(SAMPLE_CID);
          }}
          className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-foreground"
        >
          Try a sample → mandarin_macro trace
        </button>
      </div>

      <div className="p-5">
        {state.kind === "idle" && (
          <p className="rounded-md border border-dashed border-white/[0.06] px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Paste a CID above to inspect a reasoning trace
          </p>
        )}
        {state.kind === "loading" && (
          <div className="flex items-center justify-center gap-2 py-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            Fetching from web3.storage…
          </div>
        )}
        {state.kind === "miss" && (
          <div className="flex items-start gap-3 rounded-md border border-rose-400/20 bg-rose-400/[0.04] p-4">
            <AlertCircleIcon
              size={15}
              strokeWidth={1.5}
              className="mt-0.5 text-rose-300"
            />
            <div className="space-y-1">
              <p className="text-[13px] text-foreground/90">
                No matching anchor on Arc testnet
              </p>
              <p className="font-mono text-[11px] text-muted">
                CID {state.cid.slice(0, 24)}… was not found in the current
                ResponseAttested event index.
              </p>
            </div>
          </div>
        )}
        {state.kind === "ok" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
              <CheckmarkCircle02Icon
                size={15}
                strokeWidth={1.5}
                className="mt-0.5 text-emerald-300"
              />
              <div className="space-y-1">
                <p className="text-[13px] text-foreground/95">
                  Hash verified · trace matches on-chain anchor
                </p>
                <p className="font-mono text-[11px] text-muted">
                  Issued by{" "}
                  <span className="text-foreground/85">{state.step.specialistId}</span>{" "}
                  · {state.step.serviceType.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <JsonBlock
              label="Response payload"
              value={state.step.outputResponse}
              tone="output"
            />
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.01]">
              <div className="border-b border-white/[0.04] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                Reasoning trace
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/80">
                {state.step.reasoningTraceSnippet}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
