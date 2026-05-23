import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { api } from "./routes.js";
import { initStore, recordTransaction } from "./store.js";
import type {
  AgentTransaction,
  CompositionTrace,
  MarketOffer,
  MarketplaceSummary,
  SpecialistAgent,
} from "./types.js";

const app = new Hono().route("/api", api);

async function getJson<T>(path: string): Promise<T> {
  const res = await app.request(path);
  expect(res.status).toBe(200);
  return (await res.json()) as T;
}

describe("REST routes", () => {
  beforeAll(async () => {
    await initStore();
  });

  it("GET /api/health returns ok + ISO timestamp", async () => {
    const body = await getJson<{ ok: boolean; time: string }>("/api/health");
    expect(body.ok).toBe(true);
    expect(new Date(body.time).toString()).not.toBe("Invalid Date");
  });

  it("GET /api/summary returns the marketplace summary shape", async () => {
    const s = await getJson<MarketplaceSummary>("/api/summary");
    expect(typeof s.cumulativeVolumeUsdc).toBe("number");
    expect(typeof s.activeSpecialists).toBe("number");
    expect(typeof s.tracesAnchored).toBe("number");
  });

  it("GET /api/specialists returns 8 seed specialists", async () => {
    const list = await getJson<SpecialistAgent[]>("/api/specialists");
    expect(list).toHaveLength(8);
    for (const s of list) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(s.pricePerQueryUsdc).toBeGreaterThan(0);
    }
  });

  it("GET /api/transactions honors the limit query param", async () => {
    const list = await getJson<AgentTransaction[]>("/api/transactions?limit=2");
    expect(list.length).toBeLessThanOrEqual(2);
  });

  it("GET /api/atlas returns a composition trace with steps", async () => {
    const atlas = await getJson<CompositionTrace>("/api/atlas");
    expect(atlas.steps.length).toBeGreaterThan(0);
    expect(atlas.targetVenue).toMatch(/Polymarket/);
  });

  it("GET /api/leaderboard sorts by USDC earned by default", async () => {
    const list = await getJson<SpecialistAgent[]>("/api/leaderboard");
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1]?.metrics.totalEarnedUsdc ?? 0;
      const curr = list[i]?.metrics.totalEarnedUsdc ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("GET /api/leaderboard?metric=reputation sorts by reputation", async () => {
    const list = await getJson<SpecialistAgent[]>(
      "/api/leaderboard?metric=reputation",
    );
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1]?.reputation ?? 0;
      const curr = list[i]?.reputation ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("GET /api/leaderboard?metric=queries sorts by queries served", async () => {
    const list = await getJson<SpecialistAgent[]>(
      "/api/leaderboard?metric=queries",
    );
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1]?.metrics.queriesServed ?? 0;
      const curr = list[i]?.metrics.queriesServed ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("GET /api/offers returns offers ranked by reputation, tiebroken by price", async () => {
    const offers = await getJson<MarketOffer[]>("/api/offers");
    expect(offers.length).toBe(8);
    for (const o of offers) {
      expect(o.endpointUrl).toMatch(/\/specialists\//);
      expect(o.agentId).toMatch(/^0x[0-9a-f]{64}$/);
      expect(o.pricePerQueryUsdc).toBeGreaterThan(0);
    }
    // reputation desc, then price asc
    for (let i = 1; i < offers.length; i += 1) {
      const prev = offers[i - 1]!;
      const curr = offers[i]!;
      if (prev.reputation === curr.reputation) {
        expect(prev.pricePerQueryUsdc).toBeLessThanOrEqual(curr.pricePerQueryUsdc);
      } else {
        expect(prev.reputation).toBeGreaterThan(curr.reputation);
      }
    }
  });

  it("GET /api/offers?service_type=X filters to that service", async () => {
    const offers = await getJson<MarketOffer[]>(
      "/api/offers?service_type=translation",
    );
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) expect(o.serviceType).toBe("translation");
  });

  it("GET /api/offers?max_price=Y filters out pricier offers", async () => {
    const cap = 0.0001;
    const offers = await getJson<MarketOffer[]>(
      `/api/offers?max_price=${cap}`,
    );
    for (const o of offers) expect(o.pricePerQueryUsdc).toBeLessThanOrEqual(cap);
  });

  it("POST /api/ingest/trace attaches a real CID to the query's rows", async () => {
    const qid = "0x" + "cd".repeat(32);
    await recordTransaction({
      id: qid,
      timestamp: new Date().toISOString(),
      traderId: "0xtrader",
      specialistId: "0xspec (mandarin_macro)",
      serviceType: "translation",
      costUsdc: 0.00015,
      status: "RATED",
      traceCid: "0xanchor",
    });
    const res = await app.request("/api/ingest/trace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queryId: qid, traceCid: "bafyfromtrader" }),
    });
    expect(res.status).toBe(200);

    const txns = await getJson<AgentTransaction[]>("/api/transactions?limit=200");
    const row = txns.find((t) => t.id === qid);
    expect(row?.traceCid).toBe("bafyfromtrader");
  });

  it("POST /api/ingest/trace rejects a malformed query id", async () => {
    const res = await app.request("/api/ingest/trace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queryId: "0xnope", traceCid: "bafyrealcid" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/ingest/trace rejects a hash masquerading as a CID", async () => {
    const res = await app.request("/api/ingest/trace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        queryId: "0x" + "ab".repeat(32),
        traceCid: "0xdeadbeef",
      }),
    });
    expect(res.status).toBe(400);
  });
});
