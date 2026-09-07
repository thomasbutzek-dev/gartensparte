import { and, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";

export const MAX_GARDEN_NUMBER = 9999;

export type GardenCountResult = {
  created: number;
  removed: number;
  markedUnused: number;
  keptBecauseTenant: number;
};

export function parseGardenCount(value: unknown): number | null {
  const count = Number(String(value ?? "").trim());
  if (!Number.isInteger(count) || count < 1 || count > MAX_GARDEN_NUMBER) return null;
  return count;
}

function gardenHasContent(garden: {
  sizeSqm: number | null;
  meterNumber: string;
  note: string;
  polygon: string | null;
}): boolean {
  return Boolean(garden.sizeSqm || garden.meterNumber || garden.note || garden.polygon);
}

function gardenHasHistory(gardenId: number): boolean {
  const hasRow = (row: { id: number } | undefined) => Boolean(row);
  return (
    hasRow(db.select({ id: tables.tenancies.id }).from(tables.tenancies).where(eq(tables.tenancies.gardenId, gardenId)).limit(1).get()) ||
    hasRow(db.select({ id: tables.gardenDocuments.id }).from(tables.gardenDocuments).where(eq(tables.gardenDocuments.gardenId, gardenId)).limit(1).get()) ||
    hasRow(db.select({ id: tables.gardenNotes.id }).from(tables.gardenNotes).where(eq(tables.gardenNotes.gardenId, gardenId)).limit(1).get()) ||
    hasRow(db.select({ id: tables.meterReadings.id }).from(tables.meterReadings).where(eq(tables.meterReadings.gardenId, gardenId)).limit(1).get()) ||
    hasRow(db.select({ id: tables.payments.id }).from(tables.payments).where(eq(tables.payments.gardenId, gardenId)).limit(1).get()) ||
    hasRow(db.select({ id: tables.letters.id }).from(tables.letters).where(eq(tables.letters.gardenId, gardenId)).limit(1).get()) ||
    hasRow(db.select({ id: tables.applicants.id }).from(tables.applicants).where(eq(tables.applicants.gardenId, gardenId)).limit(1).get())
  );
}

/** Fehlende Nummern 1–N anlegen. Höhere Nummern ohne Pächter entfernen, wenn die Akte leer ist. */
export function applyGardenCount(count: number): GardenCountResult {
  if (parseGardenCount(count) === null) {
    throw new Error("Ungültige Gartenanzahl");
  }

  const existing = db.select().from(tables.gardens).all();
  const byNumber = new Map(existing.map((garden) => [garden.number, garden]));

  let created = 0;
  for (let number = 1; number <= count; number++) {
    if (byNumber.has(number)) continue;
    db.insert(tables.gardens).values({ number, status: "frei" }).run();
    created += 1;
  }

  let removed = 0;
  let markedUnused = 0;
  let keptBecauseTenant = 0;

  for (const garden of existing) {
    if (garden.number <= count) continue;

    const open = db
      .select({ id: tables.tenancies.id })
      .from(tables.tenancies)
      .where(and(eq(tables.tenancies.gardenId, garden.id), isNull(tables.tenancies.endDate)))
      .get();
    if (open) {
      keptBecauseTenant += 1;
      continue;
    }

    if (gardenHasContent(garden) || gardenHasHistory(garden.id)) {
      if (garden.status !== "entfaellt") {
        db.update(tables.gardens).set({ status: "entfaellt" }).where(eq(tables.gardens.id, garden.id)).run();
        markedUnused += 1;
      }
      continue;
    }

    db.delete(tables.gardens).where(eq(tables.gardens.id, garden.id)).run();
    removed += 1;
  }

  return { created, removed, markedUnused, keptBecauseTenant };
}

export type RemoveGardenResult =
  | { ok: true; number: number; files: string[] }
  | { error: "fehlt" | "pacht" };

/** Nummer und Akte entfernen. Bei laufender Pacht nicht. */
export function removeGarden(gardenId: number): RemoveGardenResult {
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  if (!garden) return { error: "fehlt" };
  const open = db
    .select({ id: tables.tenancies.id })
    .from(tables.tenancies)
    .where(and(eq(tables.tenancies.gardenId, gardenId), isNull(tables.tenancies.endDate)))
    .get();
  if (open) return { error: "pacht" };
  const files = db
    .select({ fileName: tables.gardenDocuments.fileName })
    .from(tables.gardenDocuments)
    .where(eq(tables.gardenDocuments.gardenId, gardenId))
    .all()
    .map((doc) => doc.fileName);
  db.delete(tables.gardens).where(eq(tables.gardens.id, gardenId)).run();
  return { ok: true, number: garden.number, files };
}
