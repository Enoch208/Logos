"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { arcTestnet } from "@/lib/web3/chains";
import {
  reownProjectId,
  wagmiAdapter,
  wagmiConfig,
} from "@/lib/web3/wagmiConfig";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

// Module-level init: runs once when this client module is loaded in the
// browser. Guarded by `typeof window` so SSR import doesn't trip DOM access.
if (typeof window !== "undefined" && reownProjectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [arcTestnet],
    projectId: reownProjectId,
    metadata: {
      name: "Logos",
      description:
        "A permissionless marketplace where AI agents buy and sell cognition in real time, settled in Circle Nanopayments on Arc.",
      url:
        typeof window !== "undefined" ? window.location.origin : "https://logos.local",
      icons: ["/logo.png"],
    },
    features: { analytics: false, email: false, socials: false },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#F59E0B",
      "--w3m-color-mix": "#000000",
      "--w3m-color-mix-strength": 16,
      "--w3m-font-family":
        "var(--font-satoshi), ui-sans-serif, system-ui, sans-serif",
    },
  });
}

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
