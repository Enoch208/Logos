import { createPublicClient, http, type PublicClient } from "viem";
import { config } from "./config.js";
import { recordTransaction } from "./store.js";
import type { AgentTransaction } from "./types.js";

/**
 * Real chain poller for the Logos Marketplace contract on Arc testnet.
 *
 * Wires up once these env vars are set:
 *   ARC_RPC_URL, ARC_CHAIN_ID, MARKETPLACE_ADDRESS
 *
 * Until then, callers should fall back to the mock emitter. The ABI here is
 * a placeholder — a follow-up commit replaces it with the full Marketplace
 * event surface and joins Query + Offer reads to populate trader / cost.
 */

export const MARKETPLACE_ABI = [
  {
    type: "event",
    name: "ResponseAttested",
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "responseHash", type: "bytes32", indexed: false },
      { name: "traceCID", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ResponseRated",
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "rating", type: "uint8", indexed: false },
    ],
  },
] as const;

type Handle = { stop: () => void };

export function startChainPoller(
  onTx: (tx: AgentTransaction) => void,
): Handle | null {
  if (!config.arc.rpcUrl || !config.arc.chainId || !config.arc.marketplace) {
    return null;
  }
  const client: PublicClient = createPublicClient({
    transport: http(config.arc.rpcUrl),
  });

  const unwatch = client.watchContractEvent({
    address: config.arc.marketplace as `0x${string}`,
    abi: MARKETPLACE_ABI,
    onLogs: async (logs) => {
      for (const log of logs) {
        const tx: AgentTransaction = {
          id: log.transactionHash ?? `0x${Math.random().toString(16).slice(2, 14)}`,
          timestamp: new Date().toISOString(),
          traderId: "0x_unknown",
          specialistId: "0x_unknown",
          serviceType: "unknown",
          costUsdc: 0,
          status: log.eventName === "ResponseRated" ? "RATED" : "ATTESTED",
          traceCid: "",
        };
        await recordTransaction(tx);
        onTx(tx);
      }
    },
  });

  return { stop: () => unwatch() };
}
