import {
  createPublicClient,
  http,
  keccak256,
  stringToBytes,
  type PublicClient,
} from "viem";
import { chainReady, config } from "./config.js";
import { getSpecialists, getSpecialistTotals } from "./store.js";
import type { MarketOffer, SpecialistAgent } from "./types.js";

/**
 * FR-2 — query routing / discovery.
 *
 * Returns the active offers for a service type, ranked by on-chain
 * reputation (descending), tiebroken by price (ascending). Reputation is
 * read live from the Reputation contract when the chain is reachable;
 * otherwise it falls back to the specialist's seed value so discovery
 * still works in mock mode.
 *
 * Endpoint URLs are constructed from FLEET_PUBLIC_URL to mirror the
 * fleet's mount layout (<base>/specialists/<name>).
 */

const REPUTATION_ABI = [
  {
    type: "function",
    name: "reputationFP18",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

let client: PublicClient | null = null;
function reader(): PublicClient | null {
  if (!chainReady || !config.arc.reputation) return null;
  if (!client) client = createPublicClient({ transport: http(config.arc.rpcUrl) });
  return client;
}

function agentId(name: string): `0x${string}` {
  return keccak256(stringToBytes(`logos-agent:${name}`));
}

async function liveReputation(name: string, fallback: number): Promise<number> {
  const c = reader();
  if (!c) return fallback;
  try {
    const fp18 = (await c.readContract({
      address: config.arc.reputation as `0x${string}`,
      abi: REPUTATION_ABI,
      functionName: "reputationFP18",
      args: [agentId(name)],
    })) as bigint;
    // 18-decimal fixed point in [0, 10e18] → 0.00–10.00
    return Number(fp18) / 1e18;
  } catch {
    return fallback;
  }
}

/**
 * The specialist directory + leaderboard, with live data overlaid on the seed
 * descriptors: reputation read from the on-chain Reputation contract, and
 * queries-served / USDC-earned from the cumulative per-specialist tallies that
 * grow as real RATED queries stream through. Latency and compliance stay at
 * their representative baselines (the indexer doesn't meter them per query).
 */
export async function getLiveSpecialists(): Promise<SpecialistAgent[]> {
  return Promise.all(
    getSpecialists().map(async (s) => {
      const totals = getSpecialistTotals(s.name);
      return {
        ...s,
        reputation: await liveReputation(s.name, s.reputation),
        metrics: {
          ...s.metrics,
          queriesServed: totals.queries,
          totalEarnedUsdc: totals.earned,
        },
      };
    }),
  );
}

export async function getMarketOffers(opts: {
  serviceType?: string;
  maxPriceUsdc?: number;
}): Promise<MarketOffer[]> {
  const specialists = getSpecialists().filter((s) => {
    if (opts.serviceType && s.serviceType !== opts.serviceType) return false;
    if (opts.maxPriceUsdc !== undefined && s.pricePerQueryUsdc > opts.maxPriceUsdc)
      return false;
    return s.active;
  });

  const offers: MarketOffer[] = await Promise.all(
    specialists.map(async (s) => ({
      specialist: s.name,
      agentId: agentId(s.name),
      serviceType: s.serviceType,
      pricePerQueryUsdc: s.pricePerQueryUsdc,
      reputation: await liveReputation(s.name, s.reputation),
      endpointUrl: `${config.fleetPublicUrl}/specialists/${s.name}`,
      active: s.active,
    })),
  );

  // Rank: reputation desc, then price asc — the FR-2 ordering.
  offers.sort((a, b) => {
    if (b.reputation !== a.reputation) return b.reputation - a.reputation;
    return a.pricePerQueryUsdc - b.pricePerQueryUsdc;
  });

  return offers;
}
