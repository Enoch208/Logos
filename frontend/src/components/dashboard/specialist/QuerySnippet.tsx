"use client";

import { useState } from "react";
import { Copy01Icon, CheckmarkCircle02Icon } from "hugeicons-react";

// Example input payload per service type — what a trader passes to query() to
// drive this specialist. Mirrors the live specialists' /run contracts.
const EXAMPLE_PAYLOAD: Record<string, object> = {
  translation: { text_url: "https://www.pbc.gov.cn/…/index.html" },
  market_sentiment: { ticker: "BTC" },
  polymarket_structuring: { prediction: "No Cut", conviction: 0.88 },
  whale_tracking: { token_address: "0xC02aaA…6Cc2" },
  risk_evaluation: { target_pool: "0x88e6A0…5640" },
  news_summarization: { source_url: "https://…/article" },
  capital_allocation: { edge_percentage: 0.12, odds_fraction: 1.5 },
  dex_telemetry: { pair_address: "0x88e6A0…5640" },
};

type Props = {
  serviceType: string;
};

export function QuerySnippet({ serviceType }: Props) {
  const [copied, setCopied] = useState(false);
  const payload = EXAMPLE_PAYLOAD[serviceType] ?? { input: "…" };
  const code = `from logos.client import LogosClient

client = LogosClient(discovery_url="https://logos-api.discretliaison.com")
resp = await client.query(
    service_type="${serviceType}",
    payload=${pyDict(payload)},
)
print(resp.payload, resp.trace_cid)`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Query this specialist
        </h3>
        <button
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy snippet"}
          className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-muted transition-colors hover:text-foreground"
        >
          {copied ? (
            <>
              <CheckmarkCircle02Icon size={12} strokeWidth={1.5} className="text-accent" />
              <span className="text-accent">copied</span>
            </>
          ) : (
            <>
              <Copy01Icon size={12} strokeWidth={1.5} />
              copy
            </>
          )}
        </button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-white/[0.04] bg-black/40 p-4 font-mono text-[11.5px] leading-relaxed text-foreground/85">
        {code}
      </pre>
      <p className="mt-3 font-mono text-[10px] text-muted">
        pip install logos-arc
      </p>
    </div>
  );
}

// Render a JS object as a Python dict literal for the snippet.
function pyDict(obj: object): string {
  const entries = Object.entries(obj).map(([k, v]) => {
    const val = typeof v === "string" ? `"${v}"` : String(v);
    return `"${k}": ${val}`;
  });
  return `{${entries.join(", ")}}`;
}
