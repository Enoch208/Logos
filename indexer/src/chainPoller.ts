import {
  createPublicClient,
  http,
  type AbiEvent,
  type PublicClient,
  formatUnits,
  keccak256,
  stringToBytes,
} from "viem";
import { config } from "./config.js";
import { recordTransaction, resolveTraceCid } from "./store.js";
import { SEED_SPECIALISTS } from "./seed.js";
import type { AgentTransaction, QueryStatus } from "./types.js";

/**
 * Reads Logos Marketplace events from Arc testnet and synthesizes
 * AgentTransaction rows for the dashboard. Activates only when
 * ARC_RPC_URL + ARC_CHAIN_ID + MARKETPLACE_ADDRESS are all set; otherwise the
 * service falls back to the mock emitter.
 *
 * Implementation: block-cursor `eth_getLogs` polling.
 *
 * Why not `watchContractEvent`: viem's default watcher uses RPC-side filters
 * (`eth_newFilter` + `eth_getFilterChanges`). On Arc testnet — and most
 * managed RPCs — filters are garbage-collected after a short idle window
 * (typically 5 min), at which point the watcher silently stops firing
 * without erroring. We poll `eth_getLogs` with our own block cursor + an
 * in-memory dedup set, so the indexer recovers automatically across RPC
 * filter expiry, RPC node failovers, and even indexer restarts (the
 * backfill window picks up events that fired while we were down).
 */

export const MARKETPLACE_ABI = [
  {
    type: "event",
    name: "OfferPublished",
    anonymous: false,
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
    anonymous: false,
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
    anonymous: false,
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "responseHash", type: "bytes32" },
      { name: "traceCID", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "ResponseRated",
    anonymous: false,
    inputs: [
      { name: "queryId", type: "bytes32", indexed: true },
      { name: "rating", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "QueryExpired",
    anonymous: false,
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

const WATCHED_EVENT_NAMES = [
  "QueryRecorded",
  "ResponseAttested",
  "ResponseRated",
] as const;

const WATCHED_EVENTS = MARKETPLACE_ABI.filter(
  (item) =>
    item.type === "event" &&
    (WATCHED_EVENT_NAMES as readonly string[]).includes(item.name),
) as unknown as AbiEvent[];

const EVENT_TO_STATUS: Record<string, QueryStatus> = {
  QueryRecorded: "ESCROWED",
  ResponseAttested: "ATTESTED",
  ResponseRated: "RATED",
};

const POLL_INTERVAL_MS = 4_000;
const BACKFILL_BLOCKS = 200n; // ~13 min at 4s/block — covers a restart window
const MAX_CHUNK_BLOCKS = 1_000n; // most RPCs cap getLogs at ~1k blocks
const DEDUP_CAP = 10_000;

const SERVICE_BY_HASH = buildServiceLookup();

function buildServiceLookup(): Map<string, { name: string; service: string }> {
  const map = new Map<string, { name: string; service: string }>();
  for (const s of SEED_SPECIALISTS) {
    const derived = keccak256(stringToBytes(`logos-agent:${s.name}`));
    map.set(derived.toLowerCase(), { name: s.name, service: s.serviceType });
    map.set(s.id.toLowerCase(), { name: s.name, service: s.serviceType });
  }
  return map;
}

function bytes32ToCid(raw: string): string {
  return raw;
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

  let cursor = 0n; // last block we've processed, inclusive
  const seen = new Set<string>(); // `${txHash}:${logIndex}` dedup
  let running = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function readQueryAndOffer(queryId: `0x${string}`) {
    const [trader, offerId, , , , traceCID, , , status] =
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
    const [agentId, , , pricePerQuery] = (await client.readContract({
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
    return { trader, offerId, traceCID, status, agentId, pricePerQuery };
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
        status,
        ...(rating !== undefined ? { rating } : {}),
        traceCid: resolveTraceCid(queryId, bytes32ToCid(q.traceCID)),
      };
      console.log(
        `[chainPoller] ${status} ${queryId.slice(0, 14)}… ${specialistId}`,
      );
      await recordTransaction(tx);
      onTx(tx);
    } catch (err) {
      console.warn(`[chainPoller] failed to enrich ${queryId}:`, err);
    }
  }

  function rememberLog(log: { transactionHash: string | null; logIndex: number | null }): boolean {
    if (!log.transactionHash || log.logIndex === null) return true;
    const key = `${log.transactionHash}:${log.logIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (seen.size > DEDUP_CAP) {
      // Trim oldest half — cheap and correct enough; cursor still advances.
      const half = Math.floor(DEDUP_CAP / 2);
      let i = 0;
      for (const k of seen) {
        if (i++ >= half) break;
        seen.delete(k);
      }
    }
    return true;
  }

  async function tick(): Promise<void> {
    if (!running) return;
    try {
      const latest = await client.getBlockNumber();
      if (cursor === 0n) {
        cursor = latest > BACKFILL_BLOCKS ? latest - BACKFILL_BLOCKS : 0n;
        console.log(
          `[chainPoller] starting cursor at block ${cursor} (latest=${latest}, backfill=${BACKFILL_BLOCKS})`,
        );
      }
      if (latest <= cursor) return;

      const fromBlock = cursor + 1n;
      const toBlock =
        latest > fromBlock + MAX_CHUNK_BLOCKS
          ? fromBlock + MAX_CHUNK_BLOCKS
          : latest;

      const logs = await client.getLogs({
        address: marketplace,
        events: WATCHED_EVENTS,
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        if (!rememberLog(log)) continue;
        const name = (log as { eventName?: string }).eventName;
        const status = name ? EVENT_TO_STATUS[name] : undefined;
        const args = (log as { args?: Record<string, unknown> }).args ?? {};
        const queryId = args.queryId as `0x${string}` | undefined;
        if (!queryId || !status) continue;

        const ratingArg = args.rating;
        const rating =
          typeof ratingArg === "bigint"
            ? Number(ratingArg)
            : typeof ratingArg === "number"
              ? ratingArg
              : undefined;

        await emitForQuery(queryId, status, rating);
      }

      cursor = toBlock;
    } catch (err) {
      console.warn("[chainPoller] poll iteration failed:", err);
      // Don't advance the cursor on failure — we'll retry the same window
      // next tick. If the RPC is permanently borked we'll keep logging
      // until the operator notices.
    } finally {
      if (running) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }
  }

  console.log(
    `[chainPoller] watching ${marketplace} on chainId=${config.arc.chainId} (poll=${POLL_INTERVAL_MS}ms, backfill=${BACKFILL_BLOCKS} blocks)`,
  );
  void tick();

  return {
    stop: () => {
      running = false;
      if (timer) clearTimeout(timer);
    },
  };
}
