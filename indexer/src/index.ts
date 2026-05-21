import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { chainReady, config } from "./config.js";
import { startChainPoller } from "./chainPoller.js";
import { startMockEmitter } from "./mockEmitter.js";
import { api } from "./routes.js";
import { initStore, getSummary, closeStore } from "./store.js";
import { attachWs, broadcast } from "./wsServer.js";

const app = new Hono();

app.use("*", async (c, next) => {
  const origin = c.req.header("origin") ?? "";
  const allowed =
    config.allowedOrigins.includes("*") ||
    config.allowedOrigins.includes(origin);
  if (allowed && origin) c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Headers", "content-type");
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

app.route("/api", api);

app.get("/", (c) =>
  c.json({
    service: "logos-indexer",
    status: "ok",
    mode: chainReady ? "chain" : "mock",
    ws: "/ws/feed",
    endpoints: [
      "/api/health",
      "/api/summary",
      "/api/specialists",
      "/api/transactions",
      "/api/atlas",
      "/api/leaderboard",
    ],
  }),
);

async function main() {
  const store = await initStore();
  console.log(`[indexer] store: ${store.kind}`);

  const server = serve({
    fetch: app.fetch,
    port: config.port,
    hostname: "0.0.0.0",
  }) as unknown as Server;

  const mode: "chain" | "mock" = chainReady ? "chain" : "mock";
  attachWs(server, mode);
  console.log(
    `[indexer] http://localhost:${config.port} · ws://localhost:${config.port}/ws/feed · mode=${mode}`,
  );

  const onTx = (tx: Parameters<Parameters<typeof startMockEmitter>[0]>[0]) => {
    broadcast({ type: "tx", payload: tx });
    broadcast({ type: "summary", payload: getSummary() });
  };

  const chain = chainReady ? startChainPoller(onTx) : null;
  const emitter = chain ? null : startMockEmitter(onTx);

  const shutdown = async () => {
    console.log("[indexer] shutting down…");
    chain?.stop();
    emitter?.stop();
    await closeStore();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[indexer] fatal:", err);
  process.exit(1);
});
