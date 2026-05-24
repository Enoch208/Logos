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

// Per-specialist cumulative tallies, seeded from each specialist's baseline
// metrics and incremented as real RATED queries stream in. This is what lets
// the directory + leaderboard reflect live activity instead of a fixed seed.
const specialistTotals = new Map<string, { queries: number; earned: number }>();
for (const s of SEED_SPECIALISTS) {
  specialistTotals.set(s.name, {
    queries: s.metrics.queriesServed,
    earned: s.metrics.totalEarnedUsdc,
  });
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
  return memory.state.summary;
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
  memory.state.transactions = [tx, ...memory.state.transactions].slice(0, MAX_FEED);
  memory.state.summary = {
    ...memory.state.summary,
    cumulativeVolumeUsdc:
      memory.state.summary.cumulativeVolumeUsdc + tx.costUsdc,
    totalQueriesAllTime: memory.state.summary.totalQueriesAllTime + 1,
    tracesAnchored:
      tx.status === "ATTESTED" || tx.status === "RATED"
        ? memory.state.summary.tracesAnchored + 1
        : memory.state.summary.tracesAnchored,
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
