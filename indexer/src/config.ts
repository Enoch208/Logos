import "dotenv/config";

function csv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDb: process.env.MONGODB_DB ?? "logos",
  arc: {
    rpcUrl: process.env.ARC_RPC_URL ?? "",
    chainId: process.env.ARC_CHAIN_ID
      ? Number(process.env.ARC_CHAIN_ID)
      : undefined,
    registry: process.env.AGENT_REGISTRY_ADDRESS ?? "",
    marketplace: process.env.MARKETPLACE_ADDRESS ?? "",
    reputation: process.env.REPUTATION_ADDRESS ?? "",
    // Block the Marketplace was deployed at. On boot the poller backfills from
    // here so the in-memory counters (volume / queries / traces / wallets)
    // rebuild from full chain history and survive a restart, instead of
    // resetting to a short trailing window. Unset = fall back to that window.
    deployBlock: process.env.MARKETPLACE_DEPLOY_BLOCK ?? "",
  },
  ipfsGateway: process.env.IPFS_GATEWAY ?? "https://w3s.link/ipfs",
  allowedOrigins: csv(process.env.ALLOWED_ORIGINS ?? "http://localhost:3000"),
  // Where the specialist fleet is reachable, used to construct offer
  // endpoint URLs for discovery. Mirrors the fleet's mount layout
  // (<base>/specialists/<name>).
  fleetPublicUrl: process.env.FLEET_PUBLIC_URL ?? "http://localhost:8080",
  // Optional shared secret gating the trace-CID ingest endpoint. Unset = open,
  // which is fine for local dev or a single-tenant demo box.
  ingestSecret: process.env.INGEST_SECRET ?? "",
};

export const chainReady =
  Boolean(config.arc.rpcUrl) &&
  Boolean(config.arc.marketplace) &&
  Boolean(config.arc.chainId);
