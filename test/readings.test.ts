import { describe, expect, it } from "vitest";
import { firstTourGarden, isMeterGarden, nextTourGarden, readInYear } from "@/lib/readings";

const gardens = [
  { id: 1, number: 1, status: "frei" as const, meterNumber: "" },
  { id: 2, number: 2, status: "verpachtet" as const, meterNumber: "Z-2" },
  { id: 3, number: 3, status: "verpachtet" as const, meterNumber: "Z-3" },
  { id: 4, number: 4, status: "entfaellt" as const, meterNumber: "Z-4" },
];

describe("Ablese-Tour", () => {
  it("nimmt nur Gärten mit Zähler-Nr.", () => {
    expect(gardens.filter((garden) => isMeterGarden(garden)).map((garden) => garden.number)).toEqual([2, 3]);
  });

  it("nimmt Wasserzähler unabhängig vom Stromzähler", () => {
    const mixed = [
      { id: 1, number: 1, status: "verpachtet" as const, meterNumber: "S-1", waterMeterNumber: "" },
      { id: 2, number: 2, status: "verpachtet" as const, meterNumber: "", waterMeterNumber: "W-2" },
      { id: 3, number: 3, status: "entfaellt" as const, meterNumber: "", waterMeterNumber: "W-3" },
    ];
    expect(mixed.filter((garden) => isMeterGarden(garden, "strom")).map((garden) => garden.number)).toEqual([1]);
    expect(mixed.filter((garden) => isMeterGarden(garden, "wasser")).map((garden) => garden.number)).toEqual([2]);
  });

  it("erkennt Ablesung im Jahr", () => {
    expect(readInYear("2026-03-01", 2026)).toBe(true);
    expect(readInYear("2025-12-31", 2026)).toBe(false);
    expect(readInYear(undefined, 2026)).toBe(false);
  });

  it("startet beim ersten offenen Zähler", () => {
    const latest = new Map([[2, { date: "2026-01-01" }]]);
    expect(firstTourGarden(gardens, latest, 2026)?.number).toBe(3);
  });

  it("springt zum nächsten offenen Zähler", () => {
    const latest = new Map<number, { date: string }>();
    expect(nextTourGarden(gardens, 2, latest, 2026)?.number).toBe(3);
    latest.set(3, { date: "2026-04-01" });
    expect(nextTourGarden(gardens, 2, latest, 2026)).toBeUndefined();
  });

  it("führt die Wassertour nur über Wasserzähler", () => {
    const waterGardens = [
      { id: 1, number: 1, status: "verpachtet" as const, meterNumber: "S-1", waterMeterNumber: "" },
      { id: 2, number: 2, status: "verpachtet" as const, meterNumber: "", waterMeterNumber: "W-2" },
      { id: 3, number: 3, status: "verpachtet" as const, meterNumber: "S-3", waterMeterNumber: "W-3" },
    ];
    const latest = new Map([[2, { date: "2026-01-01" }]]);
    expect(firstTourGarden(waterGardens, latest, 2026, "wasser")?.number).toBe(3);
    expect(nextTourGarden(waterGardens, 2, latest, 2026, "wasser")?.number).toBe(3);
  });
});
