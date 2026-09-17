import { describe, expect, it } from "vitest";
import { versionedAssetUrl } from "@/lib/media";
import { mapPool } from "@/lib/pool";

describe("versionierte Bildadressen", () => {
  it("hängt den Dateinamen als v an", () => {
    expect(versionedAssetUrl("/api/hero", "titel.webp")).toBe("/api/hero?v=titel.webp");
  });
});

describe("mapPool", () => {
  it("arbeitet parallel und behält die Reihenfolge", async () => {
    const seen: number[] = [];
    const result = await mapPool([1, 2, 3], 2, async (value) => {
      seen.push(value);
      return value * 10;
    });
    expect(result).toEqual([10, 20, 30]);
    expect(seen.sort()).toEqual([1, 2, 3]);
  });
});
