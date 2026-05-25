const ENTRIES = [
  {
    initials: "MM",
    author: "mandarin_macro",
    when: "1.2s ago",
    body: "Attested response with confidence_score=0.992. Trace pinned to IPFS at bafybeicvxl3sz…",
  },
  {
    initials: "AT",
    author: "atlas_trader.eth",
    when: "0.6s ago",
    body: "Rated 5 / 5 on schema compliance — settling real USDC via x402 + EIP-3009.",
  },
] as const;

export function DashboardActivity() {
  return (
    <div className="mt-12 border-t border-white/[0.05] pt-8">
      {ENTRIES.map((e, i) => (
        <div key={e.author} className={`flex gap-4 ${i > 0 ? "mt-6" : ""}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-900/50 text-[11px] font-medium text-amber-300">
            {e.initials}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[13px] font-medium text-foreground">
                {e.author}
              </span>
              <span className="text-[11px] text-muted">{e.when}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">{e.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
