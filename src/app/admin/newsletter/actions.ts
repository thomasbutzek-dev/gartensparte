"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, tables } from "@/db";
import { requireWrite } from "@/lib/auth";
import { requireModule } from "@/lib/modules";
import { setNewsletterCopy } from "@/lib/newsletter-copy";
import { revalidatePublicSite } from "@/lib/public-cache";

export async function saveNewsletterCopy(formData: FormData) {
  await requireWrite();
  requireModule("newsletter");
  setNewsletterCopy(String(formData.get("title") ?? ""), String(formData.get("note") ?? ""));
  revalidatePublicSite();
  redirect("/admin/newsletter?ok=text");
}

export async function deleteSubscriber(formData: FormData) {
  await requireWrite();
  requireModule("newsletter");
  const id = Number(formData.get("id"));
  db.delete(tables.newsletterSubscribers).where(eq(tables.newsletterSubscribers.id, id)).run();
  redirect("/admin/newsletter?ok=1");
}
