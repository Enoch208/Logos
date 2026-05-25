import { beforeAll, describe, expect, it } from "vitest";
import {
  getAtlas,
  getRecentTransactions,
  getSpecialistTotals,
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

  it("seeds the Atlas composition trace with 4 steps", () => {
    const atlas = getAtlas();
    expect(atlas.steps).toHaveLength(4);
    expect(atlas.steps[0]?.specialistId).toBe("mandarin_macro");
    expect(atlas.steps[3]?.specialistId).toBe("kelly_sizer");
    expect(atlas.totalCostUsdc).toBeCloseTo(0.00035, 8);
  });

  it("seeds the marketplace summary with the expected shape", () => {
    const s = getSummary();
    expect(s.activeSpecialists).toBe(8);
    // Counters start at zero — they only reflect real settled activity.
    expect(s.cumulativeVolumeUsdc).toBeGreaterThanOrEqual(0);
    expect(s.tracesAnchored).toBeGreaterThanOrEqual(0);
  });

  it("counts only real EVM trader addresses as wallets", async () => {
    const before = getSummary().distinctWallets;
    await recordTransaction(tx({ id: "0xmock-wallet", traderId: "0x_external_demo.eth" }));
    expect(getSummary().distinctWallets).toBe(before);

    await recordTransaction(
      tx({
        id: "0xexternal-wallet",
        traderId: "0x" + "12".repeat(20),
      }),
    );
    expect(getSummary().distinctWallets).toBe(before + 1);
    expect(getSummary().externalWallets).toBeGreaterThanOrEqual(1);
  });

  it("recordTransaction prepends to the feed, newest first", async () => {
    const before = (await getRecentTransactions()).length;
    const fresh = tx({ id: "0xfreshest", status: "ATTESTED" });
    await recordTransaction(fresh);
    const after = await getRecentTransactions();
    expect(after.length).toBeGreaterThanOrEqual(before);
    expect(after[0]?.id).toBe("0xfreshest");
  });

  it("books cumulative volume once per query, at RATED", async () => {
    const baseline = getSummary().cumulativeVolumeUsdc;
    // Non-settled rows don't move volume…
    await recordTransaction(tx({ id: "0xvol-a", status: "ATTESTED", costUsdc: 0.001234 }));
    expect(getSummary().cumulativeVolumeUsdc).toBeCloseTo(baseline, 8);
    // …only the settled (RATED) row does.
    await recordTransaction(tx({ id: "0xvol-b", status: "RATED", costUsdc: 0.001234 }));
    expect(getSummary().cumulativeVolumeUsdc).toBeCloseTo(baseline + 0.001234, 8);
  });

  it("counts each query once — trace at ATTESTED, query+volume at RATED", async () => {
    const start = getSummary();
    const startTraces = start.tracesAnchored;
    const startQueries = start.totalQueriesAllTime;

    await recordTransaction(tx({ id: "0xq-esc", status: "ESCROWED" }));
    expect(getSummary().tracesAnchored).toBe(startTraces);
    expect(getSummary().totalQueriesAllTime).toBe(startQueries);

    await recordTransaction(tx({ id: "0xq-att", status: "ATTESTED" }));
    expect(getSummary().tracesAnchored).toBe(startTraces + 1);
    expect(getSummary().totalQueriesAllTime).toBe(startQueries);

    await recordTransaction(tx({ id: "0xq-rated", status: "RATED" }));
    expect(getSummary().tracesAnchored).toBe(startTraces + 1);
    expect(getSummary().totalQueriesAllTime).toBe(startQueries + 1);
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

  it("RATED transactions bump that specialist's live totals (queries + earned)", async () => {
    const before = getSpecialistTotals("mandarin_macro");
    await recordTransaction(
      tx({
        id: "0xlivequery1",
        specialistId: "0x8a4b3c…6q7r (mandarin_macro)",
        status: "RATED",
        costUsdc: 0.00015,
      }),
    );
    const after = getSpecialistTotals("mandarin_macro");
    expect(after.queries).toBe(before.queries + 1);
    expect(after.earned).toBeCloseTo(before.earned + 0.00015, 8);
  });

  it("non-RATED transactions do not bump totals (counts each query once)", async () => {
    const before = getSpecialistTotals("twitter_sentiment");
    await recordTransaction(
      tx({
        id: "0xescrowonly",
        specialistId: "0x3f4a5b…8s9t (twitter_sentiment)",
        status: "ESCROWED",
        costUsdc: 0.00008,
      }),
    );
    expect(getSpecialistTotals("twitter_sentiment").queries).toBe(before.queries);
  });
});
