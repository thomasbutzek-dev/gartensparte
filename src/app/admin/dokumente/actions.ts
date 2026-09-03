"use server";

import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables, uploadsDir } from "@/db";
import { requireUser } from "@/lib/auth";
import { saveUpload } from "@/lib/files";
import { nowIso } from "@/lib/format";

function revalidate() {
  revalidatePath("/admin/dokumente");
  revalidatePath("/dokumente");
}

export async function uploadDocument(formData: FormData) {
  await requireUser();
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  if (!file || !title) redirect("/admin/dokumente?fehler=eingabe");
  const saved = await saveUpload(join(uploadsDir, "dokumente"), file);
  if ("error" in saved) redirect("/admin/dokumente?fehler=datei");
  db.insert(tables.documents)
    .values({
      title: title.slice(0, 200),
      category: String(formData.get("category") || "sonstiges").slice(0, 50),
      fileName: saved.fileName,
      originalName: file.name.slice(0, 200),
      mimeType: saved.mimeType,
      isPublic: formData.get("isPublic") === "1",
      uploadedAt: nowIso(),
    })
    .run();
  revalidate();
  redirect("/admin/dokumente?ok=1");
}

export async function toggleDocumentPublic(documentId: number) {
  await requireUser();
  const doc = db.select().from(tables.documents).where(eq(tables.documents.id, documentId)).get();
  if (doc) {
    db.update(tables.documents).set({ isPublic: !doc.isPublic }).where(eq(tables.documents.id, documentId)).run();
  }
  revalidate();
}

export async function deleteDocument(documentId: number) {
  await requireUser();
  const doc = db.select().from(tables.documents).where(eq(tables.documents.id, documentId)).get();
  if (doc) {
    db.delete(tables.documents).where(eq(tables.documents.id, documentId)).run();
    await unlink(join(uploadsDir, "dokumente", doc.fileName)).catch(() => {});
  }
  revalidate();
}
