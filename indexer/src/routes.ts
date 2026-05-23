import { Hono } from "hono";
import {
  getAtlas,
  getRecentTransactions,
  getSpecialists,
  getSummary,
} from "./store.js";
import { getMarketOffers } from "./offers.js";
import { config } from "./config.js";

export const api = new Hono();

api.get("/health", (c) =>
  c.json({ ok: true, time: new Date().toISOString() }),
);

api.get("/summary", (c) => c.json(getSummary()));

api.get("/specialists", (c) => c.json(getSpecialists()));

api.get("/transactions", async (c) => {
  const limit = Number(c.req.query("limit") ?? 30);
  const data = await getRecentTransactions(Math.min(200, Math.max(1, limit)));
  return c.json(data);
});

api.get("/atlas", (c) => c.json(getAtlas()));

// FR-2 discovery: matching offers ranked by reputation, tiebroken by price.
//   GET /api/offers?service_type=translation&max_price=0.0002
api.get("/offers", async (c) => {
  const serviceType = c.req.query("service_type") || undefined;
  const maxPriceRaw = c.req.query("max_price");
  const maxPriceUsdc = maxPriceRaw ? Number(maxPriceRaw) : undefined;
  const offers = await getMarketOffers({ serviceType, maxPriceUsdc });
  return c.json(offers);
});

// FR-9 trace explorer: fetch a reasoning trace by IPFS CID through the
// configured gateway. The browser can't hit arbitrary gateways under the
// dashboard's CSP/CORS, so the indexer proxies it.
//   GET /api/trace/:cid
api.get("/trace/:cid", async (c) => {
  const cid = c.req.param("cid");
  if (!cid || cid.startsWith("dev:")) {
    return c.json(
      { error: "not_on_ipfs", detail: "local dev stub — set PINATA_JWT to pin real traces" },
      404,
    );
  }
  const gateway = config.ipfsGateway.replace(/\/$/, "");
  const url = `${gateway}/${cid}`;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) {
      return c.json({ error: "gateway_error", status: res.status, url }, 502);
    }
    const trace = await res.json();
    return c.json({ cid, gateway: url, trace });
  } catch (err) {
    return c.json(
      { error: "fetch_failed", detail: String(err), url },
      502,
    );
  }
});

api.get("/leaderboard", (c) => {
  const metric = c.req.query("metric") ?? "earned";
  const ranked = [...getSpecialists()].sort((a, b) => {
    if (metric === "queries")
      return b.metrics.queriesServed - a.metrics.queriesServed;
    if (metric === "reputation") return b.reputation - a.reputation;
    return b.metrics.totalEarnedUsdc - a.metrics.totalEarnedUsdc;
  });
  return c.json(ranked);
});
