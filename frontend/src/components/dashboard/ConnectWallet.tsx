"use client";

import { useEffect, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect } from "wagmi";
import {
  WalletAdd01Icon,
  Logout01Icon,
  Copy01Icon,
} from "hugeicons-react";
import { reownProjectId } from "@/lib/web3/wagmiConfig";
import { shortenHex } from "@/lib/format";

function ConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => open()}
        className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12.5px] font-medium text-foreground transition-all duration-200 ease-out hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.98]"
      >
        <WalletAdd01Icon size={13} strokeWidth={1.5} className="text-accent" />
        Connect wallet
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      <button
        onClick={() => open({ view: "Account" })}
        className="group inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 transition-colors hover:bg-white/[0.06]"
        aria-label="Wallet menu"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/80 to-amber-700/60 text-[9px] font-medium text-amber-50">
          {address.slice(2, 4).toUpperCase()}
        </span>
        <span className="font-mono text-[11px] text-foreground/95">
          {shortenHex(address, 6, 4)}
        </span>
        {chain?.name && (
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted md:inline">
            · {chain.name}
          </span>
        )}
        <Copy01Icon
          size={11}
          strokeWidth={1.5}
          className="hidden text-muted/70 transition-colors group-hover:text-foreground sm:inline"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(address);
          }}
        />
      </button>
      <button
        onClick={() => disconnect()}
        aria-label="Disconnect"
        className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Logout01Icon size={12} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function MissingProjectIdBadge() {
  return (
    <span
      title="Set NEXT_PUBLIC_REOWN_PROJECT_ID in frontend/.env.local"
      className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Wallet · awaiting project ID
    </span>
  );
}

function ConnectSkeleton() {
  return (
    <span
      aria-hidden
      className="inline-flex h-8 w-[148px] items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted/60" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70">
        wallet
      </span>
    </span>
  );
}

export function ConnectWallet() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!mounted) return <ConnectSkeleton />;
  if (!reownProjectId) return <MissingProjectIdBadge />;
  return <ConnectButton />;
}
