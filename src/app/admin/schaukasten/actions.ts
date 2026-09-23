"use server";

import { join } from "node:path";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, tables, uploadsDir } from "@/db";
import { requireWrite } from "@/lib/auth";
import { saveImageUpload } from "@/lib/files";
import { nowIso, parseDateInput } from "@/lib/format";
import { deleteStoredFile } from "@/lib/form";
import { requireModule } from "@/lib/modules";
import { revalidatePublicSite } from "@/lib/public-cache";

const noticeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(4000),
  status: z.enum(["entwurf", "veroeffentlicht"]),
  pinned: z.boolean(),
  validFrom: z.string(),
  validUntil: z.string(),
});

function refresh() {
  revalidatePublicSite();
}

async function storeNoticeImage(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return "";
  const saved = await saveImageUpload(join(uploadsDir, "schaukasten"), file);
  if ("error" in saved) return null;
  return saved.fileName;
}

async function removeNoticeImage(fileName: string) {
  if (fileName) await deleteStoredFile(join(uploadsDir, "schaukasten", fileName));
}

export async function createNotice(formData: FormData) {
  await requireWrite();
  requireModule("schaukasten");
  const validFrom = parseDateInput(String(formData.get("validFrom") ?? "")) ?? "";
  const validUntil = parseDateInput(String(formData.get("validUntil") ?? "")) ?? "";
  const parsed = noticeSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    status: formData.get("status"),
    pinned: formData.get("pinned") === "1",
    validFrom,
    validUntil,
  });
  if (!parsed.success) redirect("/admin/schaukasten?fehler=eingabe");
  if (parsed.data.validFrom && parsed.data.validUntil && parsed.data.validUntil < parsed.data.validFrom) {
    redirect("/admin/schaukasten?fehler=zeit");
  }
  const imageFile = await storeNoticeImage(formData.get("image"));
  if (imageFile === null) redirect("/admin/schaukasten?fehler=bild");
  db.insert(tables.notices)
    .values({ ...parsed.data, imageFile, pinned: parsed.data.pinned ? 1 : 0, createdAt: nowIso() })
    .run();
  refresh();
  redirect("/admin/schaukasten?ok=1");
}

export async function toggleNotice(formData: FormData) {
  await requireWrite();
  requireModule("schaukasten");
  const id = Number(formData.get("id"));
  const field = String(formData.get("field") ?? "");
  const row = db.select().from(tables.notices).where(eq(tables.notices.id, id)).get();
  if (!row) redirect("/admin/schaukasten");
  if (field === "status") {
    db.update(tables.notices)
      .set({ status: row.status === "veroeffentlicht" ? "entwurf" : "veroeffentlicht" })
      .where(eq(tables.notices.id, id))
      .run();
  } else if (field === "pinned") {
    db.update(tables.notices)
      .set({ pinned: row.pinned ? 0 : 1 })
      .where(eq(tables.notices.id, id))
      .run();
  }
  refresh();
  redirect("/admin/schaukasten?ok=1");
}

export async function setNoticeImage(formData: FormData) {
  await requireWrite();
  requireModule("schaukasten");
  const id = Number(formData.get("id"));
  const row = db.select().from(tables.notices).where(eq(tables.notices.id, id)).get();
  if (!row) redirect("/admin/schaukasten");
  if (formData.get("remove") === "1") {
    await removeNoticeImage(row.imageFile);
    db.update(tables.notices).set({ imageFile: "" }).where(eq(tables.notices.id, id)).run();
    refresh();
    redirect("/admin/schaukasten?ok=1");
  }
  const imageFile = await storeNoticeImage(formData.get("image"));
  if (!imageFile) redirect("/admin/schaukasten?fehler=bild");
  await removeNoticeImage(row.imageFile);
  db.update(tables.notices).set({ imageFile }).where(eq(tables.notices.id, id)).run();
  refresh();
  redirect("/admin/schaukasten?ok=1");
}

export async function deleteNotice(formData: FormData) {
  await requireWrite();
  requireModule("schaukasten");
  const id = Number(formData.get("id"));
  const row = db.select().from(tables.notices).where(eq(tables.notices.id, id)).get();
  if (row) await removeNoticeImage(row.imageFile);
  db.delete(tables.notices).where(eq(tables.notices.id, id)).run();
  refresh();
  redirect("/admin/schaukasten?ok=1");
}
