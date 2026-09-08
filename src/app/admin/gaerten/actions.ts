"use server";

import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, tables, uploadsDir } from "@/db";
import { requireUser } from "@/lib/auth";
import { nowIso, parseDateInput, today } from "@/lib/format";
import { categoryFromForm, rememberGardenCategory } from "@/lib/categories";
import { saveUpload } from "@/lib/files";
import { applyGardenCount, parseGardenCount, removeGarden } from "@/lib/gardens";
import { collectGardenAttributes, rememberGardenAttribute } from "@/lib/garden-attributes";

const gardenSchema = z.object({
  sizeSqm: z.coerce.number().min(0).max(100000).optional(),
  status: z.enum(["verpachtet", "frei", "kuendigung", "entfaellt"]),
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

function readGardenNumber(formData: FormData): number | null {
  const number = Number(String(formData.get("number") ?? "").trim());
  if (!Number.isInteger(number) || number < 1 || number > 9999) return null;
  return number;
}

function numberIsTaken(gardenId: number, number: number): boolean {
  const taken = db.select({ id: tables.gardens.id }).from(tables.gardens).where(eq(tables.gardens.number, number)).get();
  return Boolean(taken && taken.id !== gardenId);
}

export async function updateGarden(gardenId: number, formData: FormData) {
  await requireUser();
  const data = parseGarden(formData);
  const number = readGardenNumber(formData);
  if (number === null) redirect(`/admin/gaerten/${gardenId}?fehler=nummer`);
  if (numberIsTaken(gardenId, number)) redirect(`/admin/gaerten/${gardenId}?fehler=vergeben`);
  if (data.status === "entfaellt") {
    const open = db
      .select({ id: tables.tenancies.id })
      .from(tables.tenancies)
      .where(and(eq(tables.tenancies.gardenId, gardenId), isNull(tables.tenancies.endDate)))
      .get();
    if (open) redirect(`/admin/gaerten/${gardenId}?fehler=pacht`);
  }
  db.update(tables.gardens)
    .set({
      number,
      sizeSqm: data.sizeSqm ?? null,
      status: data.status,
      attributes: JSON.stringify(collectGardenAttributes(formData)),
      meterNumber: data.meterNumber,
      note: data.note,
    })
    .where(eq(tables.gardens.id, gardenId))
    .run();
  revalidatePath(`/admin/gaerten/${gardenId}`);
  revalidatePath("/admin/gaerten");
  revalidatePath("/freie-gaerten");
  revalidatePath("/admin/karte");
  redirect(`/admin/gaerten/${gardenId}?ok=1`);
}

export async function setGardenCount(formData: FormData) {
  await requireUser();
  const count = parseGardenCount(formData.get("count"));
  if (count === null) redirect("/admin/gaerten?fehler=anzahl");
  const result = applyGardenCount(count);
  revalidatePath("/admin/gaerten");
  revalidatePath("/admin");
  revalidatePath("/freie-gaerten");
  revalidatePath("/admin/karte");
  const query = new URLSearchParams({
    ok: "anzahl",
    angelegt: String(result.created),
    entfernt: String(result.removed),
    ausgeblendet: String(result.markedUnused),
    behalten: String(result.keptBecauseTenant),
  });
  redirect(`/admin/gaerten?${query}`);
}

export async function deleteGarden(gardenId: number, formData: FormData) {
  await requireUser();
  if (String(formData.get("bestaetigt")) !== "ja") {
    redirect(`/admin/gaerten/${gardenId}?fehler=bestaetigung`);
  }
  const result = removeGarden(gardenId);
  if ("error" in result) {
    if (result.error === "fehlt") redirect("/admin/gaerten");
    redirect(`/admin/gaerten/${gardenId}?fehler=pacht-loeschen`);
  }
  for (const fileName of result.files) {
    await unlink(join(uploadsDir, "gaerten", fileName)).catch(() => {});
  }
  revalidatePath("/admin/gaerten");
  revalidatePath("/admin");
  revalidatePath("/freie-gaerten");
  revalidatePath("/admin/karte");
  redirect("/admin/gaerten?ok=geloescht");
}

export async function createGarden(formData: FormData) {
  await requireUser();
  const number = Number(String(formData.get("number") ?? "").trim());
  if (!Number.isInteger(number) || number < 1 || number > 9999) redirect("/admin/gaerten?fehler=nummer");
  const existing = db.select({ id: tables.gardens.id }).from(tables.gardens).where(eq(tables.gardens.number, number)).get();
  if (existing) redirect("/admin/gaerten?fehler=vergeben");
  db.insert(tables.gardens).values({ number, status: "frei" }).run();
  const created = db.select({ id: tables.gardens.id }).from(tables.gardens).where(eq(tables.gardens.number, number)).get();
  revalidatePath("/admin/gaerten");
  if (created) redirect(`/admin/gaerten/${created.id}?ok=angelegt`);
  redirect("/admin/gaerten?ok=angelegt");
}

export async function createGardenAttribute(formData: FormData) {
  await requireUser();
  const result = rememberGardenAttribute(String(formData.get("merkmal") ?? ""));
  revalidatePath("/admin/gaerten");
  revalidatePath("/admin/gaerten/erfassen");
  if (result === "leer") redirect("/admin/gaerten?fehler=merkmal");
  if (result === "bekannt") redirect("/admin/gaerten?ok=merkmal-da");
  redirect("/admin/gaerten?ok=merkmal");
}

/** Schnellerfassung: speichern und zum nächsten Garten springen. */
export async function quickSaveGarden(gardenId: number, formData: FormData) {
  await requireUser();
  const data = parseGarden(formData);
  const current = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  if (!current) redirect("/admin/gaerten");
  const number = readGardenNumber(formData);
  if (number === null) redirect(`/admin/gaerten/erfassen?nr=${current.number}&fehler=nummer`);
  if (numberIsTaken(gardenId, number)) redirect(`/admin/gaerten/erfassen?nr=${current.number}&fehler=vergeben`);
  db.update(tables.gardens)
    .set({
      number,
      sizeSqm: data.sizeSqm ?? null,
      status: data.status,
      attributes: JSON.stringify(collectGardenAttributes(formData)),
      meterNumber: data.meterNumber,
      note: data.note,
    })
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
        .values({ gardenId, memberId, startDate: parseDateInput(String(formData.get("startDate") ?? "")) || today() })
        .run();
      db.update(tables.gardens).set({ status: "verpachtet" }).where(eq(tables.gardens.id, gardenId)).run();
    }
  }

  const next = db
    .select()
    .from(tables.gardens)
    .where(gt(tables.gardens.number, number))
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
  const data = tenantSchema.parse({
    memberId: formData.get("memberId"),
    startDate: parseDateInput(String(formData.get("startDate") ?? "")) || today(),
  });
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
  const endDate = parseDateInput(String(formData.get("endDate") ?? "")) || today();
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
    .values({ gardenId, date: parseDateInput(String(formData.get("date") ?? "")) || today(), authorId: user.id, text: text.slice(0, 5000) })
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
  const category = categoryFromForm(formData);
  rememberGardenCategory(category);
  db.insert(tables.gardenDocuments)
    .values({
      gardenId,
      category,
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
