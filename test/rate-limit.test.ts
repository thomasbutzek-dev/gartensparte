import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "gartensparte-rate-"));

const { recordRateFailure, isRateLimited, clearRateLimit, consumeFormSlot } = await import("@/lib/rate-limit");

describe("Rate-Limits", () => {
  it("sperrt nach fünf Fehlversuchen", () => {
    const key = "login:tester";
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) {
      expect(recordRateFailure(key, 5, 60_000, 60_000, now + i)).toBe(false);
    }
    expect(recordRateFailure(key, 5, 60_000, 60_000, now + 4)).toBe(true);
    expect(isRateLimited(key, now + 5)).toBe(true);
    expect(isRateLimited(key, now + 4 + 60_001)).toBe(false);
    clearRateLimit(key);
    expect(isRateLimited(key, now + 5)).toBe(false);
  });

  it("begrenzt öffentliche Formulare", () => {
    const key = "form:inquiry:abc";
    const now = 2_000_000;
    for (let i = 0; i < 5; i++) {
      expect(consumeFormSlot(key, 5, 60_000, now + i)).toBe(true);
    }
    expect(consumeFormSlot(key, 5, 60_000, now + 5)).toBe(false);
    expect(consumeFormSlot(key, 5, 60_000, now + 60_001)).toBe(true);
  });
});
