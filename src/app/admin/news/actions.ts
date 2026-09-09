"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireWrite } from "@/lib/auth";
import { nowIso } from "@/lib/format";
import { isRichTextEmpty, readRichText } from "@/lib/rich-text";

const newsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20000),
  status: z.enum(["entwurf", "veroeffentlicht"]),
  pinned: z.boolean(),
});

function parseNews(formData: FormData) {
  return newsSchema.parse({
    title: formData.get("title"),
    body: readRichText(formData, "body"),
    status: formData.get("status") ?? "entwurf",
    pinned: formData.get("pinned") === "1",
  });
}

function revalidate() {
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
}

export async function createNews(formData: FormData) {
  await requireWrite();
  const data = parseNews(formData);
  if (isRichTextEmpty(data.body)) redirect("/admin/news?fehler=text");
  db.insert(tables.news)
    .values({ ...data, createdAt: nowIso(), publishedAt: data.status === "veroeffentlicht" ? nowIso() : null })
    .run();
  revalidate();
  redirect("/admin/news?ok=1");
}

export async function updateNews(newsId: number, formData: FormData) {
  await requireWrite();
  const data = parseNews(formData);
  if (isRichTextEmpty(data.body)) redirect(`/admin/news/${newsId}?fehler=text`);
  const existing = db.select().from(tables.news).where(eq(tables.news.id, newsId)).get();
  db.update(tables.news)
    .set({
      ...data,
      publishedAt: data.status === "veroeffentlicht" ? existing?.publishedAt ?? nowIso() : existing?.publishedAt ?? null,
    })
    .where(eq(tables.news.id, newsId))
    .run();
  revalidate();
  redirect("/admin/news?ok=1");
}

export async function toggleNewsStatus(newsId: number) {
  await requireWrite();
  const item = db.select().from(tables.news).where(eq(tables.news.id, newsId)).get();
  if (item) {
    const publish = item.status !== "veroeffentlicht";
    db.update(tables.news)
      .set({ status: publish ? "veroeffentlicht" : "entwurf", publishedAt: publish ? item.publishedAt ?? nowIso() : item.publishedAt })
      .where(eq(tables.news.id, newsId))
      .run();
  }
  revalidate();
}

export async function deleteNews(newsId: number) {
  await requireWrite();
  db.delete(tables.news).where(eq(tables.news.id, newsId)).run();
  revalidate();
}
