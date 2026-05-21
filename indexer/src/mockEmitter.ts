import { SEED_SPECIALISTS } from "./seed.js";
import { recordTransaction } from "./store.js";
import type { AgentTransaction, QueryStatus } from "./types.js";

const TRADERS = [
  "0x_atlas_trader.eth",
  "0x_external_theo_bot.eth",
  "0x_arbitrage_agent_4.eth",
  "0x_perp_pilot_alpha.eth",
  "0x_copy_trader_07.eth",
  "0x_yieldscout.eth",
];

const STATUSES: QueryStatus[] = ["ESCROWED", "ATTESTED", "RATED"];
const HEX = "0123456789abcdef";

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function randHex(n: number): string {
  let s = "";
  for (let i = 0; i < n; i += 1) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

export function makeMockTransaction(): AgentTransaction {
  const specialist = pick(SEED_SPECIALISTS);
  const status = pick(STATUSES);
  return {
    id: `0x${randHex(12)}...${randHex(4)}`,
    timestamp: new Date().toISOString(),
    traderId: pick(TRADERS),
    specialistId: `${specialist.id.slice(0, 8)}…${specialist.id.slice(-4)} (${specialist.name})`,
    serviceType: specialist.serviceType,
    costUsdc: specialist.pricePerQueryUsdc,
    status,
    rating: status === "RATED" ? 4 + Math.round(Math.random()) : undefined,
    traceCid: `bafybei${randHex(8)}...`,
  };
}

type EmitterHandle = { stop: () => void };

export function startMockEmitter(
  onTx: (tx: AgentTransaction) => void,
  intervalMs = 2400,
): EmitterHandle {
  const id = setInterval(async () => {
    const tx = makeMockTransaction();
    await recordTransaction(tx);
    onTx(tx);
  }, intervalMs);
  return {
    stop: () => clearInterval(id),
  };
}
