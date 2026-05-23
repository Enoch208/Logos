import { beforeAll, describe, expect, it } from "vitest";
import {
  getAtlas,
  getRecentTransactions,
  getSpecialists,
  getSummary,
  initStore,
  recordTransaction,
  resolveTraceCid,
  setTraceCid,
} from "./store.js";
import type { AgentTransaction } from "./types.js";

function tx(overrides: Partial<AgentTransaction> = {}): AgentTransaction {
  return {
    id: `0xtest${Math.random().toString(16).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    traderId: "0x_test_trader.eth",
    specialistId: "0xspecialist (test_specialist)",
    serviceType: "test",
    costUsdc: 0.0001,
    status: "ATTESTED",
    traceCid: "bafytest",
    ...overrides,
  };
}

describe("store", () => {
  beforeAll(async () => {
    // Force memory store — no MONGODB_URI is set in test env.
    await initStore();
  });

  it("seeds 8 specialists", () => {
    const specialists = getSpecialists();
    expect(specialists).toHaveLength(8);
    const names = specialists.map((s) => s.name);
    expect(names).toContain("mandarin_macro");
    expect(names).toContain("polymarket_structurer");
  });

  it("seeds the Atlas composition trace with 3 steps", () => {
    const atlas = getAtlas();
    expect(atlas.steps).toHaveLength(3);
    expect(atlas.steps[0]?.specialistId).toBe("mandarin_macro");
    expect(atlas.totalCostUsdc).toBeGreaterThan(0);
  });

  it("seeds the marketplace summary with the expected shape", () => {
    const s = getSummary();
    expect(s.activeSpecialists).toBe(8);
    expect(s.cumulativeVolumeUsdc).toBeGreaterThan(0);
    expect(s.tracesAnchored).toBeGreaterThan(0);
  });

  it("recordTransaction prepends to the feed, newest first", async () => {
    const before = (await getRecentTransactions()).length;
    const fresh = tx({ id: "0xfreshest", status: "ATTESTED" });
    await recordTransaction(fresh);
    const after = await getRecentTransactions();
    expect(after.length).toBeGreaterThanOrEqual(before);
    expect(after[0]?.id).toBe("0xfreshest");
  });

  it("recordTransaction bumps cumulative volume by costUsdc", async () => {
    const baseline = getSummary().cumulativeVolumeUsdc;
    await recordTransaction(tx({ costUsdc: 0.001234 }));
    const after = getSummary().cumulativeVolumeUsdc;
    expect(after).toBeCloseTo(baseline + 0.001234, 8);
  });

  it("recordTransaction increments tracesAnchored only on ATTESTED/RATED", async () => {
    const summary = getSummary();
    const startTraces = summary.tracesAnchored;
    const startQueries = summary.totalQueriesAllTime;

    await recordTransaction(tx({ status: "ESCROWED" }));
    expect(getSummary().tracesAnchored).toBe(startTraces);
    expect(getSummary().totalQueriesAllTime).toBe(startQueries + 1);

    await recordTransaction(tx({ status: "ATTESTED" }));
    await recordTransaction(tx({ status: "RATED" }));
    expect(getSummary().tracesAnchored).toBe(startTraces + 2);
    expect(getSummary().totalQueriesAllTime).toBe(startQueries + 3);
  });

  it("getRecentTransactions respects the limit param", async () => {
    for (let i = 0; i < 5; i += 1) {
      await recordTransaction(tx({ id: `0xbulk-${i}` }));
    }
    const three = await getRecentTransactions(3);
    expect(three.length).toBe(3);
  });

  it("setTraceCid overrides the on-chain anchor for matching query rows", async () => {
    const qid = "0xqueryWithRealCid";
    await recordTransaction(tx({ id: qid, status: "ESCROWED", traceCid: "0xanchor" }));
    await recordTransaction(tx({ id: qid, status: "RATED", traceCid: "0xanchor" }));

    setTraceCid(qid, "bafyrealcid");

    const rows = (await getRecentTransactions(200)).filter((t) => t.id === qid);
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.traceCid).toBe("bafyrealcid");
  });

  it("setTraceCid applies to rows recorded after the report (late chain events)", async () => {
    const qid = "0xlateQuery";
    setTraceCid(qid, "bafylatecid");
    await recordTransaction(tx({ id: qid, status: "ATTESTED", traceCid: "0xanchor" }));

    const row = (await getRecentTransactions(200)).find((t) => t.id === qid);
    expect(row?.traceCid).toBe("bafylatecid");
  });

  it("resolveTraceCid falls back to the anchor when no CID was reported", () => {
    expect(resolveTraceCid("0xneverReported", "0xanchor")).toBe("0xanchor");
  });
});
