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

let mongoClient: MongoClient | undefined;
let txCollection: Collection<AgentTransaction> | undefined;

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
  if (txCollection) {
    return txCollection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }
  return memory.state.transactions.slice(0, limit);
}

export async function recordTransaction(tx: AgentTransaction): Promise<void> {
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
