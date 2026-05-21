import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { api } from "./routes.js";
import { initStore } from "./store.js";
import type {
  AgentTransaction,
  CompositionTrace,
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
});
