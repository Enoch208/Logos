import { defineChain } from "viem";

/**
 * Arc testnet chain definition. Env vars override the defaults below; the
 * defaults are Arc's own public testnet so a missing env doesn't silently
 * point wallets at the wrong network.
 */
export const arcTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002),
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: process.env.NEXT_PUBLIC_ARC_EXPLORER ?? "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});
