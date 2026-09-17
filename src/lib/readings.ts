export type MeterKind = "strom" | "wasser";

export const meterKind = {
  strom: {
    title: "Strom ablesen",
    path: "/admin/ablesen",
    unit: "kWh",
    placeholder: "z.B. 1534,7",
    numberLabel: "Stromzähler-Nr.",
  },
  wasser: {
    title: "Wasser ablesen",
    path: "/admin/ablesen/wasser",
    unit: "m³",
    placeholder: "z.B. 123,4",
    numberLabel: "Wasserzähler-Nr.",
  },
} as const;

type MeterFields = {
  status: string;
  meterNumber?: string | null;
  waterMeterNumber?: string | null;
};

export function parseMeterKind(value: string | null | undefined): MeterKind {
  return value === "wasser" ? "wasser" : "strom";
}

export function meterNumberOf(garden: MeterFields, kind: MeterKind): string {
  const value = kind === "wasser" ? garden.waterMeterNumber : garden.meterNumber;
  return (value ?? "").trim();
}

export function isMeterGarden(garden: MeterFields, kind: MeterKind = "strom"): boolean {
  return garden.status !== "entfaellt" && meterNumberOf(garden, kind) !== "";
}

export function readInYear(date: string | undefined, year: string | number): boolean {
  return Boolean(date?.startsWith(String(year)));
}

export function firstTourGarden<T extends { id: number; number: number } & MeterFields>(
  gardens: T[],
  latestByGarden: Map<number, { date: string }>,
  year: string | number,
  kind: MeterKind = "strom",
): T | undefined {
  const withMeter = gardens.filter((garden) => isMeterGarden(garden, kind));
  return withMeter.find((garden) => !readInYear(latestByGarden.get(garden.id)?.date, year)) ?? withMeter[0];
}

export function nextTourGarden<T extends { id: number; number: number } & MeterFields>(
  gardens: T[],
  afterNumber: number,
  latestByGarden: Map<number, { date: string }>,
  year: string | number,
  kind: MeterKind = "strom",
): T | undefined {
  return gardens
    .filter((garden) => isMeterGarden(garden, kind))
    .find((garden) => garden.number > afterNumber && !readInYear(latestByGarden.get(garden.id)?.date, year));
}
