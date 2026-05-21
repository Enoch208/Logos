const CODE_LINES = [
  { n: 1, content: <span className="text-muted"># Atlas composing 3 specialists for one bet</span> },
  { n: 2, content: <><span className="text-purple-400">from</span> logos <span className="text-purple-400">import</span> LogosClient</> },
  { n: 3, content: <span /> },
  { n: 4, content: <>client = <span className="text-sky-400">LogosClient</span>(wallet=trader_wallet)</> },
  { n: 5, content: <span /> },
  { n: 6, content: <>news = client.<span className="text-yellow-300">query</span>(</> },
  { n: 7, content: <>{"  "}service_type=<span className="text-amber-300">{`"translation"`}</span>,</> },
  { n: 8, content: <>{"  "}payload={"{"}<span className="text-amber-300">{`"text_url"`}</span>: pbc_url{"}"},</> },
  { n: 9, content: <>{"  "}max_price_usdc=<span className="text-yellow-300">0.00015</span>,</> },
  { n: 10, content: <>)</> },
  { n: 11, content: <span /> },
  { n: 12, content: <span className="text-muted"># → signed, attested, trace pinned to IPFS</span> },
] as const;

export function CodeEditorVisual() {
  return (
    <div className="px-8 pt-8 [perspective:1800px]">
      <div
        className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/0 shadow-2xl transition-all duration-500 ease-out group-hover:[transform:rotateX(2deg)_scale(1.02)] group-hover:-translate-y-2"
        style={{
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 8%, black 82%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 8%, black 82%, transparent 100%)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-accent/30 ring-1 ring-accent/50" />
            <span className="h-3 w-3 rounded-full bg-white/10 ring-1 ring-white/20" />
            <span className="h-3 w-3 rounded-full bg-white/10 ring-1 ring-white/20" />
          </div>
          <div className="flex gap-5 font-mono text-[11px] text-muted">
            <span className="text-foreground">trader.py</span>
            <span className="cursor-pointer transition-colors hover:text-foreground/80">
              schemas/
            </span>
            <span className="cursor-pointer transition-colors hover:text-foreground/80">
              logs
            </span>
          </div>
        </div>
        <div className="px-5 py-5 font-mono text-[12px] leading-[1.65]">
          {CODE_LINES.map((line) => (
            <div key={line.n} className="flex gap-4">
              <span className="w-4 select-none text-right text-muted/60">{line.n}</span>
              <span className="text-foreground/85">{line.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
