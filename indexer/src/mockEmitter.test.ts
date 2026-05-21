import { describe, expect, it } from "vitest";
import { makeMockTransaction } from "./mockEmitter.js";
import { SEED_SPECIALISTS } from "./seed.js";

const VALID_STATUSES = new Set(["ESCROWED", "ATTESTED", "RATED"]);
const SERVICE_TYPES = new Set(SEED_SPECIALISTS.map((s) => s.serviceType));
const PRICE_VALUES = new Set(SEED_SPECIALISTS.map((s) => s.pricePerQueryUsdc));

describe("makeMockTransaction", () => {
  it("produces a transaction with the expected shape", () => {
    const tx = makeMockTransaction();
    expect(tx.id).toMatch(/^0x[0-9a-f]+\.\.\.[0-9a-f]{4}$/);
    expect(tx.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(VALID_STATUSES.has(tx.status)).toBe(true);
    expect(SERVICE_TYPES.has(tx.serviceType)).toBe(true);
    expect(PRICE_VALUES.has(tx.costUsdc)).toBe(true);
  });

  it("attaches a 4–5 rating only when RATED", () => {
    for (let i = 0; i < 100; i += 1) {
      const tx = makeMockTransaction();
      if (tx.status === "RATED") {
        expect(tx.rating).toBeGreaterThanOrEqual(4);
        expect(tx.rating).toBeLessThanOrEqual(5);
      } else {
        expect(tx.rating).toBeUndefined();
      }
    }
  });

  it("emits distinct ids across many calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      ids.add(makeMockTransaction().id);
    }
    // It's astronomically unlikely to collide more than a couple of times
    // with 12 hex digits of entropy. Allow 1 collision before flagging.
    expect(ids.size).toBeGreaterThanOrEqual(49);
  });

  it("renders specialistId with the human name in parens", () => {
    const tx = makeMockTransaction();
    expect(tx.specialistId).toMatch(/\([a-z_]+\)$/);
  });
});
