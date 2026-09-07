import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "gartensparte-hours-"));

const { creditedWorkHours, missingWorkHours } = await import("@/lib/work-hours");

describe("Arbeitsstunden-Soll", () => {
  it("zählt Sondertätigkeit als erfüllt", () => {
    expect(creditedWorkHours(0, true, 8)).toBe(8);
    expect(missingWorkHours(0, true, 8)).toBe(0);
  });

  it("rechnet ohne Befreiung die Fehlstunden", () => {
    expect(creditedWorkHours(3, false, 8)).toBe(3);
    expect(missingWorkHours(3, false, 8)).toBe(5);
  });
});
