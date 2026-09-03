"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";

export async function toggleInquiryRead(inquiryId: number) {
  await requireUser();
  const inquiry = db.select().from(tables.inquiries).where(eq(tables.inquiries.id, inquiryId)).get();
  if (inquiry) {
    db.update(tables.inquiries).set({ isRead: !inquiry.isRead }).where(eq(tables.inquiries.id, inquiryId)).run();
  }
  revalidatePath("/admin/posteingang");
}

export async function deleteInquiry(inquiryId: number) {
  await requireUser();
  db.delete(tables.inquiries).where(eq(tables.inquiries.id, inquiryId)).run();
  revalidatePath("/admin/posteingang");
}
