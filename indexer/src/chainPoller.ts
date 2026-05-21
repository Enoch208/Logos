import {
  createPublicClient,
  http,
  type Log,
  type PublicClient,
  formatUnits,
  hexToString,
  keccak256,
  stringToBytes,
  trim,
} from "viem";
import { config } from "./config.js";
import { recordTransaction } from "./store.js";
import { SEED_SPECIALISTS } from "./seed.js";
import type { AgentTransaction, QueryStatus } from "./types.js";

/**
 * Reads Logos Marketplace events from Arc testnet and synthesizes
 * AgentTransaction rows for the dashboard. Activates only when
 * ARC_RPC_URL + ARC_CHAIN_ID + MARKETPLACE_ADDRESS are all set; otherwise the
 * service falls back to the mock emitter.
 */

export const MARKETPLACE_ABI = [
  {
    type: "event",
    name: "OfferPublished",
    inputs: [
      { name: "offerId", type: "bytes32", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "serviceTypeHash", type: "bytes32", indexed: true },
      { name: "pricePerQuery", type: "uint256" },
      { name: "endpointURL", type: "string" },
    ],
  },
  {
    type: "event",
    name: "QueryRecorded",
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "offerId", type: "bytes32", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "paymentAuthHash", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "ResponseAttested",
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "responseHash", type: "bytes32" },
      { name: "traceCID", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "ResponseRated",
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "rating", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "QueryExpired",
    inputs: [{ name: "queryId", type: "bytes32", indexed: true }],
  },
  {
    type: "function",
    name: "queries",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "trader", type: "address" },
      { name: "offerId", type: "bytes32" },
      { name: "paymentAuthHash", type: "bytes32" },
      { name: "queryPayloadHash", type: "bytes32" },
      { name: "responseHash", type: "bytes32" },
      { name: "traceCID", type: "bytes32" },
      { name: "rating", type: "uint8" },
      { name: "createdAt", type: "uint64" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "offers",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "agentId", type: "bytes32" },
      { name: "serviceTypeHash", type: "bytes32" },
      { name: "schemaHash", type: "bytes32" },
      { name: "pricePerQuery", type: "uint256" },
      { name: "endpointURL", type: "string" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

const SERVICE_BY_HASH = buildServiceLookup();

function buildServiceLookup(): Map<string, { name: string; service: string }> {
  const map = new Map<string, { name: string; service: string }>();
  // The Python specialist derives its agentId as
  //   keccak256(utf8 bytes("logos-agent:" + name))
  // — `logos.canonical.keccak_text` on the agents side. Mirror that here so
  // the dashboard can translate on-chain agentIds back to human names.
  for (const s of SEED_SPECIALISTS) {
    const derived = keccak256(stringToBytes(`logos-agent:${s.name}`));
    map.set(derived.toLowerCase(), { name: s.name, service: s.serviceType });
    // Also seed the mock-data id so chainPoller and mock mode share names.
    map.set(s.id.toLowerCase(), { name: s.name, service: s.serviceType });
  }
  return map;
}

function bytes32ToCid(raw: string): string {
  // The marketplace stores the IPFS CID as bytes32 (multihash digest, no
  // codec prefix). Indexer presents it as-is — a follow-up can reconstruct
  // the multibase CIDv1 string given the codec/version.
  return raw;
}

function ratingFromLog(log: Log & { args?: { rating?: number | bigint } }): number | undefined {
  const r = log.args?.rating;
  if (r === undefined) return undefined;
  return typeof r === "bigint" ? Number(r) : r;
}

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
  const marketplace = config.arc.marketplace as `0x${string}`;

  async function readQueryAndOffer(queryId: `0x${string}`) {
    const [trader, offerId, paymentAuthHash, , responseHash, traceCID, rating, createdAt, status] =
      (await client.readContract({
        address: marketplace,
        abi: MARKETPLACE_ABI,
        functionName: "queries",
        args: [queryId],
      })) as readonly [
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        number,
        bigint,
        number,
      ];
    const [agentId, serviceTypeHash, , pricePerQuery] = (await client.readContract({
      address: marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "offers",
      args: [offerId],
    })) as readonly [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      bigint,
      string,
      boolean,
    ];
    return {
      trader,
      offerId,
      paymentAuthHash,
      responseHash,
      traceCID,
      rating,
      createdAt,
      status,
      agentId,
      serviceTypeHash,
      pricePerQuery,
    };
  }

  function describeSpecialist(agentId: string) {
    const hit = SERVICE_BY_HASH.get(agentId.toLowerCase());
    if (hit)
      return {
        specialistId: `${agentId.slice(0, 10)}…${agentId.slice(-4)} (${hit.name})`,
        serviceType: hit.service,
      };
    return {
      specialistId: `${agentId.slice(0, 10)}…${agentId.slice(-4)}`,
      serviceType: "unknown",
    };
  }

  async function emitForQuery(
    queryId: `0x${string}`,
    status: QueryStatus,
    rating?: number,
  ) {
    try {
      const q = await readQueryAndOffer(queryId);
      const { specialistId, serviceType } = describeSpecialist(q.agentId);
      const tx: AgentTransaction = {
        id: queryId,
        timestamp: new Date().toISOString(),
        traderId: q.trader,
        specialistId,
        serviceType,
        costUsdc: Number(formatUnits(q.pricePerQuery, 6)),
        // Status reflects the EVENT that fired, not the chain's current
        // state — by the time we enrich, the query may have advanced past
        // the event we're processing.
        status,
        ...(rating !== undefined ? { rating } : {}),
        traceCid: bytes32ToCid(q.traceCID),
      };
      console.log(`[chainPoller] ${status} ${queryId.slice(0, 14)}… ${specialistId}`);
      await recordTransaction(tx);
      onTx(tx);
    } catch (err) {
      console.warn(`[chainPoller] failed to enrich ${queryId}:`, err);
    }
  }

  const unwatches = [
    client.watchContractEvent({
      address: marketplace,
      abi: MARKETPLACE_ABI,
      eventName: "QueryRecorded",
      onLogs: (logs) => {
        for (const log of logs) {
          const id = (log as { args?: { queryId?: `0x${string}` } }).args?.queryId;
          if (id) void emitForQuery(id, "ESCROWED");
        }
      },
    }),
    client.watchContractEvent({
      address: marketplace,
      abi: MARKETPLACE_ABI,
      eventName: "ResponseAttested",
      onLogs: (logs) => {
        for (const log of logs) {
          const id = (log as { args?: { queryId?: `0x${string}` } }).args?.queryId;
          if (id) void emitForQuery(id, "ATTESTED");
        }
      },
    }),
    client.watchContractEvent({
      address: marketplace,
      abi: MARKETPLACE_ABI,
      eventName: "ResponseRated",
      onLogs: (logs) => {
        for (const log of logs) {
          const id = (log as { args?: { queryId?: `0x${string}` } }).args?.queryId;
          if (id) void emitForQuery(id, "RATED", ratingFromLog(log));
        }
      },
    }),
  ];

  console.log(`[chainPoller] watching ${marketplace} on chainId=${config.arc.chainId}`);

  return {
    stop: () => {
      for (const u of unwatches) u();
    },
  };
}

// Re-export utilities for future use / introspection.
export { hexToString, trim };
