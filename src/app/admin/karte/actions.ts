"use server";

import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables, uploadsDir } from "@/db";
import { canWrite, requireUser, requireWrite } from "@/lib/auth";
import { saveUpload } from "@/lib/files";
import { setMapBackgroundFile } from "@/lib/map";
import { getSettings, saveSettings } from "@/lib/settings";

const pointsSchema = z.array(z.tuple([z.number().min(0).max(2000), z.number().min(0).max(2000)])).min(3).max(200);

export async function savePolygon(gardenId: number, points: [number, number][]) {
  const user = await requireUser();
  if (!canWrite(user)) return { error: "Im Demo-Modus wird nichts gespeichert." };
  const parsed = pointsSchema.safeParse(points);
  if (!parsed.success) return { error: "Ungültige Fläche (mindestens 3 Punkte)." };
  const rounded = parsed.data.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  db.update(tables.gardens).set({ polygon: JSON.stringify(rounded) }).where(eq(tables.gardens.id, gardenId)).run();
  revalidatePath("/admin/karte");
  revalidatePath("/freie-gaerten");
  return { ok: true };
}

export async function deletePolygon(gardenId: number) {
  const user = await requireUser();
  if (!canWrite(user)) return { error: "Im Demo-Modus wird nichts gespeichert." };
  db.update(tables.gardens).set({ polygon: null }).where(eq(tables.gardens.id, gardenId)).run();
  revalidatePath("/admin/karte");
  revalidatePath("/freie-gaerten");
  return { ok: true };
}

export async function uploadMapBackground(formData: FormData) {
  await requireWrite();
  const file = formData.get("file") as File | null;
  if (!file) redirect("/admin/karte?fehler=datei");
  const saved = await saveUpload(join(uploadsDir, "karte"), file);
  if ("error" in saved) redirect("/admin/karte?fehler=datei");
  setMapBackgroundFile(saved.fileName);
  revalidatePath("/admin/karte");
  redirect("/admin/karte?ok=1");
}

export async function updatePublicLageplanVisibility(formData: FormData) {
  await requireWrite();
  const current = getSettings();
  saveSettings({ ...current, showPublicLageplan: formData.get("showPublicLageplan") === "1" });
  revalidatePath("/admin/karte");
  revalidatePath("/freie-gaerten");
  redirect("/admin/karte?ok=1");
}
