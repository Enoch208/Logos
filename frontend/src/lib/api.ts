import type {
  AgentTransaction,
  CompositionTrace,
  MarketplaceSummary,
  SpecialistAgent,
} from "@/data/mockData";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws/feed";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  summary: () => fetchJson<MarketplaceSummary>("/api/summary"),
  specialists: () => fetchJson<SpecialistAgent[]>("/api/specialists"),
  transactions: (limit = 30) =>
    fetchJson<AgentTransaction[]>(`/api/transactions?limit=${limit}`),
  atlas: () => fetchJson<CompositionTrace>("/api/atlas"),
  leaderboard: (metric: "earned" | "reputation" | "queries" = "earned") =>
    fetchJson<SpecialistAgent[]>(`/api/leaderboard?metric=${metric}`),
};

export type WsMessage =
  | { type: "tx"; payload: AgentTransaction }
  | { type: "summary"; payload: MarketplaceSummary }
  | {
      type: "hello";
      payload: { mode: "chain" | "mock"; serverTimeIso: string };
    };
