import { defineChain } from "viem";

/**
 * Arc testnet (Canteen-hosted) chain definition.
 *
 * Per PRD §7.2, Arc mainnet is not yet live (targeted summer 2026); the
 * hackathon runs against Canteen's hosted Arc testnet. Fill the RPC URL +
 * chain ID + explorer below when you have them from the hackathon brief.
 */
export const arcTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 421614),
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_RPC_URL ??
          "https://sepolia-rollup.arbitrum.io/rpc",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: process.env.NEXT_PUBLIC_ARC_EXPLORER ?? "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
});
