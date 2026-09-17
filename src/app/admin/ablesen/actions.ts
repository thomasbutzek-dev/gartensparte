"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireWrite } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/format";
import { meterKind, nextTourGarden, parseMeterKind, type MeterKind } from "@/lib/readings";

const readingSchema = z.object({
  date: z.string().trim().min(1),
  value: z.coerce.number().min(0).max(10_000_000),
  note: z.string().trim().max(500).default(""),
});

function revalidateMeterPaths(gardenId: number) {
  revalidatePath("/admin/ablesen");
  revalidatePath("/admin/ablesen/wasser");
  revalidatePath("/admin/gaerten");
  revalidatePath(`/admin/gaerten/${gardenId}`);
}

function kindPath(kind: MeterKind): string {
  return meterKind[kind].path;
}

export async function saveReading(gardenId: number, kind: MeterKind, formData: FormData) {
  const user = await requireWrite();
  const meter = parseMeterKind(kind);
  const raw = String(formData.get("value") ?? "").replace(",", ".");
  const parsed = readingSchema.safeParse({
    date: parseDateInput(String(formData.get("date") ?? "")) || today(),
    value: raw,
    note: formData.get("note"),
  });
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  if (!garden) redirect(kindPath(meter));
  if (!parsed.success) redirect(`${kindPath(meter)}?nr=${garden.number}&fehler=wert`);

  db.insert(tables.meterReadings)
    .values({
      gardenId,
      kind: meter,
      date: parsed.data.date,
      value: parsed.data.value,
      readBy: user.id,
      note: parsed.data.note,
    })
    .run();
  revalidateMeterPaths(gardenId);

  if (formData.get("weiter") === "1") {
    const year = parsed.data.date.slice(0, 4);
    const gardens = db.select().from(tables.gardens).orderBy(asc(tables.gardens.number)).all();
    const readings = db
      .select()
      .from(tables.meterReadings)
      .where(eq(tables.meterReadings.kind, meter))
      .orderBy(desc(tables.meterReadings.date), desc(tables.meterReadings.id))
      .all();
    const latestByGarden = new Map<number, { date: string }>();
    for (const reading of readings) {
      if (!latestByGarden.has(reading.gardenId)) latestByGarden.set(reading.gardenId, reading);
    }
    latestByGarden.set(garden.id, { date: parsed.data.date });
    const next = nextTourGarden(gardens, garden.number, latestByGarden, year, meter);
    if (next) redirect(`${kindPath(meter)}?nr=${next.number}&ok=1`);
  }
  redirect(`${kindPath(meter)}?ok=1`);
}

export async function saveMeterNumber(gardenId: number, kind: MeterKind, formData: FormData) {
  await requireWrite();
  const meter = parseMeterKind(kind);
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  if (!garden) redirect(kindPath(meter));
  const meterNumber = String(formData.get("meterNumber") ?? "").trim().slice(0, 100);
  const patch = meter === "wasser" ? { waterMeterNumber: meterNumber } : { meterNumber };
  db.update(tables.gardens).set(patch).where(eq(tables.gardens.id, gardenId)).run();
  revalidateMeterPaths(gardenId);
  const stand = String(formData.get("stand") ?? "");
  const query = stand === "erledigt" || stand === "alle" ? `stand=${stand}&` : "";
  redirect(`${kindPath(meter)}?${query}ok=zaehler`);
}

export async function deleteReading(readingId: number, gardenId: number) {
  await requireWrite();
  db.delete(tables.meterReadings).where(eq(tables.meterReadings.id, readingId)).run();
  revalidateMeterPaths(gardenId);
}
