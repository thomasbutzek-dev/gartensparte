"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";

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
    date: formData.get("date"),
    hours: String(formData.get("hours") ?? "").replace(",", "."),
    activity: formData.get("activity"),
  });
  if (!parsed.success) redirect("/admin/arbeitsstunden?fehler=1");
  db.insert(tables.workHours).values(parsed.data).run();
  revalidatePath("/admin/arbeitsstunden");
  redirect(`/admin/arbeitsstunden?mitglied=${parsed.data.memberId}&ok=1`);
}

export async function deleteWorkHours(entryId: number, memberId: number) {
  await requireUser();
  db.delete(tables.workHours).where(eq(tables.workHours.id, entryId)).run();
  revalidatePath("/admin/arbeitsstunden");
  redirect(`/admin/arbeitsstunden?mitglied=${memberId}`);
}
