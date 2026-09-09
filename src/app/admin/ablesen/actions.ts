"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireWrite } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/format";

const readingSchema = z.object({
  date: z.string().trim().min(1),
  value: z.coerce.number().min(0).max(10_000_000),
  note: z.string().trim().max(500).default(""),
});

export async function saveReading(gardenId: number, formData: FormData) {
  const user = await requireWrite();
  const raw = String(formData.get("value") ?? "").replace(",", ".");
  const parsed = readingSchema.safeParse({
    date: parseDateInput(String(formData.get("date") ?? "")) || today(),
    value: raw,
    note: formData.get("note"),
  });
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  if (!garden) redirect("/admin/ablesen");
  if (!parsed.success) redirect(`/admin/ablesen?nr=${garden.number}&fehler=wert`);

  db.insert(tables.meterReadings)
    .values({ gardenId, date: parsed.data.date, value: parsed.data.value, readBy: user.id, note: parsed.data.note })
    .run();
  revalidatePath("/admin/ablesen");
  revalidatePath(`/admin/gaerten/${gardenId}`);

  // Weiter zum nächsten Garten mit Zähler (Ablese-Tour)
  if (formData.get("weiter") === "1") {
    const candidates = db
      .select()
      .from(tables.gardens)
      .where(gt(tables.gardens.number, garden.number))
      .orderBy(asc(tables.gardens.number))
      .all();
    const real = candidates.filter((g) => g.status !== "entfaellt");
    const next = real.find((g) => g.meterNumber) ?? real[0];
    if (next) redirect(`/admin/ablesen?nr=${next.number}&ok=1`);
  }
  redirect(`/admin/ablesen?ok=1`);
}

export async function deleteReading(readingId: number, gardenId: number) {
  await requireWrite();
  db.delete(tables.meterReadings).where(eq(tables.meterReadings.id, readingId)).run();
  revalidatePath("/admin/ablesen");
  revalidatePath(`/admin/gaerten/${gardenId}`);
}
