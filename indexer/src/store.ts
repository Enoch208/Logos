import { MongoClient, type Collection, type Db } from "mongodb";
import { config } from "./config.js";
import {
  SEED_ATLAS_TRACE,
  SEED_SPECIALISTS,
  SEED_SUMMARY,
  SEED_TRANSACTIONS,
} from "./seed.js";
import type {
  AgentTransaction,
  CompositionTrace,
  MarketplaceSummary,
  SpecialistAgent,
} from "./types.js";

const MAX_FEED = 200;

type Persisted = {
  specialists: SpecialistAgent[];
  transactions: AgentTransaction[];
  summary: MarketplaceSummary;
  atlas: CompositionTrace;
};

class MemoryStore {
  state: Persisted = {
    specialists: SEED_SPECIALISTS,
    transactions: SEED_TRANSACTIONS,
    summary: { ...SEED_SUMMARY },
    atlas: SEED_ATLAS_TRACE,
  };
}

const memory = new MemoryStore();

// The chain anchors only the keccak canonical-trace hash (bytes32). The real
// IPFS CID is reported off-chain by the trader after it reads the attestation
// (POST /api/ingest/trace). We join it onto transactions by query id so the
// live feed links to a resolvable trace instead of the raw on-chain anchor.
const traceCidByQuery = new Map<string, string>();

let mongoClient: MongoClient | undefined;
let txCollection: Collection<AgentTransaction> | undefined;

export function setTraceCid(queryId: string, cid: string): void {
  const key = queryId.toLowerCase();
  traceCidByQuery.set(key, cid);
  for (const t of memory.state.transactions) {
    if (t.id.toLowerCase() === key) t.traceCid = cid;
  }
  txCollection
    ?.updateMany({ id: queryId }, { $set: { traceCid: cid } })
    .catch((err) => console.warn("[store] traceCid update failed:", err));
}

export function resolveTraceCid(queryId: string, fallback: string): string {
  return traceCidByQuery.get(queryId.toLowerCase()) ?? fallback;
}

// Distinct trader wallets that have queried the marketplace (fed only by real
// recordTransaction calls / chain backfill, never the static seed). "Internal"
// = Atlas + our own fleet key; everything else is external adoption. Override
// the internal set with INTERNAL_TRADERS (comma-separated) if keys change.
const INTERNAL_TRADERS = new Set(
  (
    process.env.INTERNAL_TRADERS ??
    "0xf87bed27ede71fa644cd593d026728e583804b78," +
      "0x339fdb1ff1a79151ba4536c58896a03b79abb6be," +
      "0x_atlas_trader.eth"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);
const distinctTraders = new Set<string>();

function countWallets(): { distinctWallets: number; externalWallets: number } {
  let external = 0;
  for (const t of distinctTraders) if (!INTERNAL_TRADERS.has(t)) external += 1;
  return { distinctWallets: distinctTraders.size, externalWallets: external };
}

// Per-specialist tallies start at zero and count only real RATED queries — the
// directory + leaderboard reflect genuine settled activity, never a seed.
const specialistTotals = new Map<string, { queries: number; earned: number }>();
for (const s of SEED_SPECIALISTS) {
  specialistTotals.set(s.name, { queries: 0, earned: 0 });
}

function bumpSpecialistTotals(tx: AgentTransaction): void {
  if (tx.status !== "RATED") return; // count each completed query exactly once
  const name = /\(([^)]+)\)/.exec(tx.specialistId)?.[1];
  if (!name) return;
  const t = specialistTotals.get(name);
  if (!t) return;
  t.queries += 1;
  t.earned += tx.costUsdc;
}

export function getSpecialistTotals(name: string): { queries: number; earned: number } {
  const t = specialistTotals.get(name);
  return t ? { queries: t.queries, earned: t.earned } : { queries: 0, earned: 0 };
}

export async function initStore(): Promise<{ kind: "mongo" | "memory" }> {
  if (!config.mongoUri) return { kind: "memory" };
  try {
    mongoClient = new MongoClient(config.mongoUri);
    await mongoClient.connect();
    const db: Db = mongoClient.db(config.mongoDb);
    txCollection = db.collection<AgentTransaction>("transactions");
    await txCollection.createIndex({ id: 1 }, { unique: true });
    await txCollection.createIndex({ timestamp: -1 });
    const count = await txCollection.estimatedDocumentCount();
    if (count === 0 && SEED_TRANSACTIONS.length > 0) {
      await txCollection.insertMany(SEED_TRANSACTIONS, { ordered: false });
    }
    return { kind: "mongo" };
  } catch (err) {
    console.warn("[store] Mongo connect failed, using memory:", err);
    mongoClient = undefined;
    txCollection = undefined;
    return { kind: "memory" };
  }
}

export function getSpecialists(): SpecialistAgent[] {
  return memory.state.specialists;
}

export function getSummary(): MarketplaceSummary {
  // queriesLastHour is computed live from the feed — distinct RATED queries in
  // the trailing hour — rather than carried as a static number.
  const hourAgo = Date.now() - 3_600_000;
  const queriesLastHour = new Set(
    memory.state.transactions
      .filter((t) => t.status === "RATED" && Date.parse(t.timestamp) >= hourAgo)
      .map((t) => t.id),
  ).size;
  return { ...memory.state.summary, queriesLastHour, ...countWallets() };
}

export function getAtlas(): CompositionTrace {
  return memory.state.atlas;
}

export async function getRecentTransactions(limit = 30): Promise<AgentTransaction[]> {
  const rows = txCollection
    ? await txCollection.find().sort({ timestamp: -1 }).limit(limit).toArray()
    : memory.state.transactions.slice(0, limit);
  // Late-arriving CID reports may post after a row was stored, so resolve at
  // read time too — the override map is authoritative regardless of ordering.
  return rows.map((t) => {
    const cid = traceCidByQuery.get(t.id.toLowerCase());
    return cid && cid !== t.traceCid ? { ...t, traceCid: cid } : t;
  });
}

export async function recordTransaction(tx: AgentTransaction): Promise<void> {
  bumpSpecialistTotals(tx);
  if (tx.traderId) distinctTraders.add(tx.traderId.toLowerCase());
  memory.state.transactions = [tx, ...memory.state.transactions].slice(0, MAX_FEED);
  // Count each query exactly once: a trace is anchored at ATTESTED; volume +
  // the query itself are booked at RATED (settled). A query streams as three
  // rows (ESCROWED/ATTESTED/RATED), so without this the counters triple-count.
  const s = memory.state.summary;
  memory.state.summary = {
    ...s,
    cumulativeVolumeUsdc:
      tx.status === "RATED" ? s.cumulativeVolumeUsdc + tx.costUsdc : s.cumulativeVolumeUsdc,
    totalQueriesAllTime:
      tx.status === "RATED" ? s.totalQueriesAllTime + 1 : s.totalQueriesAllTime,
    tracesAnchored:
      tx.status === "ATTESTED" ? s.tracesAnchored + 1 : s.tracesAnchored,
  };
  if (txCollection) {
    try {
      await txCollection.insertOne(tx);
    } catch (err) {
      console.warn("[store] tx insert failed:", err);
    }
  }
}

export async function closeStore(): Promise<void> {
  await mongoClient?.close();
}
