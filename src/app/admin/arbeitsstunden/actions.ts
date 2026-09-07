"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseDateInput } from "@/lib/format";

const hoursSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  date: z.string().trim().min(1),
  hours: z.coerce.number().min(0.25).max(24),
  activity: z.string().trim().max(300).default(""),
});

export async function addWorkHours(formData: FormData) {
  await requireUser();
  const parsed = hoursSchema.safeParse({
    memberId: formData.get("memberId"),
    date: parseDateInput(String(formData.get("date") ?? "")) ?? "",
    hours: String(formData.get("hours") ?? "").replace(",", "."),
    activity: formData.get("activity"),
  });
  if (!parsed.success) redirect("/admin/arbeitsstunden?fehler=1");
  db.insert(tables.workHours).values(parsed.data).run();
  revalidatePath("/admin/arbeitsstunden");
  redirect(`/admin/arbeitsstunden?mitglied=${parsed.data.memberId}&ok=1`);
}

export async function setWorkExemption(formData: FormData) {
  await requireUser();
  const memberId = Number(formData.get("memberId"));
  const year = Number(formData.get("year"));
  const duty = String(formData.get("duty") ?? "").trim();
  const custom = String(formData.get("custom") ?? "").trim();
  const reason = (duty === "sonstiges" ? custom : duty).trim().slice(0, 120);
  if (!Number.isInteger(memberId) || memberId < 1 || !Number.isInteger(year) || year < 2000 || year > 2100) {
    redirect("/admin/arbeitsstunden?fehler=befreiung");
  }
  if (!reason) redirect(`/admin/arbeitsstunden?mitglied=${memberId}&jahr=${year}&fehler=befreiung`);

  const existing = db
    .select()
    .from(tables.workExemptions)
    .where(and(eq(tables.workExemptions.memberId, memberId), eq(tables.workExemptions.year, year)))
    .get();
  if (existing) {
    db.update(tables.workExemptions).set({ reason }).where(eq(tables.workExemptions.id, existing.id)).run();
  } else {
    db.insert(tables.workExemptions).values({ memberId, year, reason }).run();
  }
  revalidatePath("/admin/arbeitsstunden");
  revalidatePath(`/admin/mitglieder/${memberId}`);
  redirect(`/admin/arbeitsstunden?mitglied=${memberId}&jahr=${year}&ok=befreiung`);
}

export async function clearWorkExemption(memberId: number, year: number) {
  await requireUser();
  db.delete(tables.workExemptions)
    .where(and(eq(tables.workExemptions.memberId, memberId), eq(tables.workExemptions.year, year)))
    .run();
  revalidatePath("/admin/arbeitsstunden");
  revalidatePath(`/admin/mitglieder/${memberId}`);
  redirect(`/admin/arbeitsstunden?mitglied=${memberId}&jahr=${year}`);
}

export async function deleteWorkHours(entryId: number, memberId: number) {
  await requireUser();
  db.delete(tables.workHours).where(eq(tables.workHours.id, entryId)).run();
  revalidatePath("/admin/arbeitsstunden");
  redirect(`/admin/arbeitsstunden?mitglied=${memberId}`);
}
