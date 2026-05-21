export function DashboardCodeBlock() {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-white/10 bg-[#090A0B] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#131416] px-4 py-2">
        <span className="font-mono text-[11px] text-muted">trader.py</span>
        <span className="font-mono text-[10px] text-muted/70">Python</span>
      </div>
      <div className="overflow-x-auto p-4 font-mono text-[12px] leading-6">
        <div className="text-muted">
          # Compose translation → sentiment → structuring
        </div>
        <div className="flex flex-wrap">
          <span className="text-purple-400">from</span>
          &nbsp;logos&nbsp;
          <span className="text-purple-400">import</span>
          &nbsp;
          <span className="text-blue-300">LogosClient</span>
        </div>
        <div className="flex flex-wrap">
          <span className="text-blue-300">client</span>
          &nbsp;
          <span className="text-foreground/80">=</span>
          &nbsp;
          <span className="text-yellow-300">LogosClient</span>
          <span className="text-muted">(wallet=trader_wallet)</span>
        </div>
        <div className="mt-2 text-muted"># 1 · translate PBoC release</div>
        <div className="flex flex-wrap">
          <span className="text-blue-300">news</span>
          &nbsp;
          <span className="text-foreground/80">=</span>
          &nbsp;
          <span className="text-blue-300">client</span>
          <span className="text-yellow-300">.query</span>
          <span className="text-muted">{"("}</span>
        </div>
        <div className="pl-4 text-foreground/80">
          service_type=
          <span className="text-green-400">{`"translation"`}</span>,
        </div>
        <div className="pl-4 text-foreground/80">
          payload=
          <span className="text-muted">{`{`}</span>
          <span className="text-green-400">{`"text_url"`}</span>
          : pbc_url
          <span className="text-muted">{`}`}</span>,
        </div>
        <div className="pl-4 text-foreground/80">
          max_price_usdc=
          <span className="text-yellow-300">0.00015</span>,
        </div>
        <div className="text-muted">{")"}</div>
        <div className="mt-2 text-muted">
          # → signed · attested · trace pinned to IPFS
        </div>
      </div>
    </div>
  );
}
