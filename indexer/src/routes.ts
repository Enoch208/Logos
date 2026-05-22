import { Hono } from "hono";
import {
  getAtlas,
  getRecentTransactions,
  getSpecialists,
  getSummary,
} from "./store.js";
import { getMarketOffers } from "./offers.js";

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
