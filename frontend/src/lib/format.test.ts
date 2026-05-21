import { describe, expect, it } from "vitest";
import {
  formatLatency,
  formatNumberCompact,
  formatNumberFull,
  formatPercent,
  formatRelativeTime,
  formatReputation,
  formatUsdc,
  formatUsdcCompact,
  shortenHex,
} from "@/lib/format";

describe("formatUsdc", () => {
  it("renders 6 decimals by default for sub-cent values", () => {
    expect(formatUsdc(0.00015)).toBe("$0.000150");
  });
  it("honors custom decimals", () => {
    expect(formatUsdc(0.123, 2)).toBe("$0.12");
  });
});

describe("formatUsdcCompact", () => {
  it("uses 2 decimals when amount is at least $1", () => {
    expect(formatUsdcCompact(18.7894)).toBe("$18.79");
  });
  it("uses 4 decimals between 1¢ and $1", () => {
    expect(formatUsdcCompact(0.5)).toBe("$0.5000");
  });
  it("uses 6 decimals for sub-cent amounts", () => {
    expect(formatUsdcCompact(0.00015)).toBe("$0.000150");
  });
});

describe("formatNumberCompact", () => {
  it("returns plain formatted numbers under 1000", () => {
    expect(formatNumberCompact(999)).toBe("999");
  });
  it("uses K with two decimals for the 1K..10K band", () => {
    expect(formatNumberCompact(1234)).toBe("1.23K");
  });
  it("uses K with one decimal for 10K..1M", () => {
    expect(formatNumberCompact(24150)).toBe("24.1K");
    expect(formatNumberCompact(141000)).toBe("141.0K");
  });
  it("uses M for >= 1M", () => {
    expect(formatNumberCompact(2_400_000)).toBe("2.4M");
  });
});

describe("formatNumberFull", () => {
  it("inserts thousand separators", () => {
    expect(formatNumberFull(161399)).toBe("161,399");
  });
});

describe("shortenHex", () => {
  it("preserves short strings unchanged", () => {
    expect(shortenHex("0x1234", 6, 4)).toBe("0x1234");
  });
  it("trims long hex with an ellipsis", () => {
    const hex = "0xabcdef0123456789abcdef0123456789";
    expect(shortenHex(hex)).toBe("0xabcd…6789");
  });
  it("honors custom head/tail widths", () => {
    expect(shortenHex("0xdeadbeefcafe", 4, 2)).toBe("0xde…fe");
  });
});

describe("formatLatency", () => {
  it("renders sub-second values in ms", () => {
    expect(formatLatency(420)).toBe("420ms");
  });
  it("rolls to seconds at the boundary", () => {
    expect(formatLatency(1000)).toBe("1.00s");
    expect(formatLatency(1499)).toBe("1.50s");
  });
});

describe("formatRelativeTime", () => {
  const NOW = Date.parse("2026-05-21T08:45:00Z");

  it("renders seconds-ago for recent timestamps", () => {
    expect(formatRelativeTime("2026-05-21T08:44:55Z", NOW)).toBe("5s ago");
  });
  it("renders minutes-ago between 1m and 1h", () => {
    expect(formatRelativeTime("2026-05-21T08:30:00Z", NOW)).toBe("15m ago");
  });
  it("renders hours-ago between 1h and 1d", () => {
    expect(formatRelativeTime("2026-05-21T03:45:00Z", NOW)).toBe("5h ago");
  });
  it("renders days-ago beyond 24h", () => {
    expect(formatRelativeTime("2026-05-18T08:45:00Z", NOW)).toBe("3d ago");
  });
  it("clamps negative diffs (future timestamps) to 0s", () => {
    expect(formatRelativeTime("2030-01-01T00:00:00Z", NOW)).toBe("0s ago");
  });
});

describe("formatReputation", () => {
  it("renders with two decimals", () => {
    expect(formatReputation(9.844)).toBe("9.84");
    expect(formatReputation(10)).toBe("10.00");
  });
});

describe("formatPercent", () => {
  it("converts ratio to percent with one decimal by default", () => {
    expect(formatPercent(0.998)).toBe("99.8%");
  });
  it("respects custom decimal precision", () => {
    expect(formatPercent(0.991, 2)).toBe("99.10%");
  });
});
