"use server";

import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, tables, uploadsDir } from "@/db";
import { requireUser } from "@/lib/auth";
import { nowIso, today } from "@/lib/format";
import { saveUpload } from "@/lib/files";

const gardenSchema = z.object({
  sizeSqm: z.coerce.number().min(0).max(100000).optional(),
  status: z.enum(["verpachtet", "frei", "kuendigung", "verwahrlost"]),
  meterNumber: z.string().trim().max(100).default(""),
  note: z.string().trim().max(5000).default(""),
});

function parseGarden(formData: FormData) {
  const size = String(formData.get("sizeSqm") ?? "").replace(",", ".");
  return gardenSchema.parse({
    sizeSqm: size === "" ? undefined : size,
    status: formData.get("status"),
    meterNumber: formData.get("meterNumber"),
    note: formData.get("note"),
  });
}

export async function updateGarden(gardenId: number, formData: FormData) {
  await requireUser();
  const data = parseGarden(formData);
  db.update(tables.gardens)
    .set({ sizeSqm: data.sizeSqm ?? null, status: data.status, meterNumber: data.meterNumber, note: data.note })
    .where(eq(tables.gardens.id, gardenId))
    .run();
  revalidatePath(`/admin/gaerten/${gardenId}`);
  redirect(`/admin/gaerten/${gardenId}?ok=1`);
}

/** Schnellerfassung: speichern und zum nächsten Garten springen. */
export async function quickSaveGarden(gardenId: number, formData: FormData) {
  await requireUser();
  const data = parseGarden(formData);
  db.update(tables.gardens)
    .set({ sizeSqm: data.sizeSqm ?? null, status: data.status, meterNumber: data.meterNumber, note: data.note })
    .where(eq(tables.gardens.id, gardenId))
    .run();

  const memberId = Number(formData.get("memberId") || 0);
  if (memberId > 0) {
    const open = db
      .select()
      .from(tables.tenancies)
      .where(and(eq(tables.tenancies.gardenId, gardenId), isNull(tables.tenancies.endDate)))
      .get();
    if (!open || open.memberId !== memberId) {
      if (open) {
        db.update(tables.tenancies).set({ endDate: today() }).where(eq(tables.tenancies.id, open.id)).run();
      }
      db.insert(tables.tenancies)
        .values({ gardenId, memberId, startDate: String(formData.get("startDate") || today()) })
        .run();
      db.update(tables.gardens).set({ status: "verpachtet" }).where(eq(tables.gardens.id, gardenId)).run();
    }
  }

  const current = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  const next = db
    .select()
    .from(tables.gardens)
    .where(gt(tables.gardens.number, current?.number ?? 0))
    .orderBy(asc(tables.gardens.number))
    .limit(1)
    .get();
  revalidatePath("/admin/gaerten");
  if (next) redirect(`/admin/gaerten/erfassen?nr=${next.number}`);
  redirect("/admin/gaerten?erfasst=1");
}

const tenantSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  startDate: z.string().trim().min(1),
});

/** Pächterwechsel: offenes Pachtverhältnis beenden, neues anlegen. */
export async function changeTenant(gardenId: number, formData: FormData) {
  await requireUser();
  const data = tenantSchema.parse({ memberId: formData.get("memberId"), startDate: formData.get("startDate") });
  const open = db
    .select()
    .from(tables.tenancies)
    .where(and(eq(tables.tenancies.gardenId, gardenId), isNull(tables.tenancies.endDate)))
    .get();
  if (open) {
    db.update(tables.tenancies).set({ endDate: data.startDate }).where(eq(tables.tenancies.id, open.id)).run();
  }
  db.insert(tables.tenancies).values({ gardenId, memberId: data.memberId, startDate: data.startDate }).run();
  db.update(tables.gardens).set({ status: "verpachtet" }).where(eq(tables.gardens.id, gardenId)).run();
  revalidatePath(`/admin/gaerten/${gardenId}`);
  redirect(`/admin/gaerten/${gardenId}?ok=1`);
}

/** Pachtverhältnis beenden, Garten wird frei. */
export async function endTenancy(gardenId: number, formData: FormData) {
  await requireUser();
  const endDate = String(formData.get("endDate") || today());
  const open = db
    .select()
    .from(tables.tenancies)
    .where(and(eq(tables.tenancies.gardenId, gardenId), isNull(tables.tenancies.endDate)))
    .get();
  if (open) {
    db.update(tables.tenancies).set({ endDate }).where(eq(tables.tenancies.id, open.id)).run();
    db.update(tables.gardens).set({ status: "frei" }).where(eq(tables.gardens.id, gardenId)).run();
  }
  revalidatePath(`/admin/gaerten/${gardenId}`);
  redirect(`/admin/gaerten/${gardenId}?ok=1`);
}

export async function addGardenNote(gardenId: number, formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) redirect(`/admin/gaerten/${gardenId}`);
  db.insert(tables.gardenNotes)
    .values({ gardenId, date: String(formData.get("date") || today()), authorId: user.id, text: text.slice(0, 5000) })
    .run();
  revalidatePath(`/admin/gaerten/${gardenId}`);
  redirect(`/admin/gaerten/${gardenId}`);
}

export async function deleteGardenNote(noteId: number, gardenId: number) {
  await requireUser();
  db.delete(tables.gardenNotes).where(eq(tables.gardenNotes.id, noteId)).run();
  revalidatePath(`/admin/gaerten/${gardenId}`);
}

export async function uploadGardenDocument(gardenId: number, formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file) redirect(`/admin/gaerten/${gardenId}?fehler=datei`);
  const saved = await saveUpload(join(uploadsDir, "gaerten"), file);
  if ("error" in saved) redirect(`/admin/gaerten/${gardenId}?fehler=datei`);
  db.insert(tables.gardenDocuments)
    .values({
      gardenId,
      category: String(formData.get("category") || "sonstiges").slice(0, 50),
      fileName: saved.fileName,
      originalName: file.name.slice(0, 200),
      mimeType: saved.mimeType,
      uploadedAt: nowIso(),
      uploadedBy: user.id,
    })
    .run();
  revalidatePath(`/admin/gaerten/${gardenId}`);
  redirect(`/admin/gaerten/${gardenId}`);
}

export async function deleteGardenDocument(docId: number, gardenId: number) {
  await requireUser();
  const doc = db.select().from(tables.gardenDocuments).where(eq(tables.gardenDocuments.id, docId)).get();
  if (doc) {
    db.delete(tables.gardenDocuments).where(eq(tables.gardenDocuments.id, docId)).run();
    await unlink(join(uploadsDir, "gaerten", doc.fileName)).catch(() => {});
  }
  revalidatePath(`/admin/gaerten/${gardenId}`);
}
