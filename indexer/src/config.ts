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
  },
  ipfsGateway: process.env.IPFS_GATEWAY ?? "https://w3s.link/ipfs",
  allowedOrigins: csv(process.env.ALLOWED_ORIGINS ?? "http://localhost:3000"),
};

export const chainReady =
  Boolean(config.arc.rpcUrl) &&
  Boolean(config.arc.marketplace) &&
  Boolean(config.arc.chainId);
