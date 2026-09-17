"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireWrite } from "@/lib/auth";

export async function setApplicantStatus(applicantId: number, formData: FormData) {
  await requireWrite();
  const parsed = z.enum(["offen", "kontaktiert", "vergeben", "zurueckgezogen"]).safeParse(formData.get("status"));
  if (!parsed.success) redirect("/admin/warteliste?fehler=eingabe");
  db.update(tables.applicants).set({ status: parsed.data }).where(eq(tables.applicants.id, applicantId)).run();
  revalidatePath("/admin/warteliste");
}

export async function saveApplicantNote(applicantId: number, formData: FormData) {
  await requireWrite();
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  db.update(tables.applicants).set({ note }).where(eq(tables.applicants.id, applicantId)).run();
  revalidatePath("/admin/warteliste");
}

export async function deleteApplicant(applicantId: number) {
  await requireWrite();
  db.delete(tables.applicants).where(eq(tables.applicants.id, applicantId)).run();
  revalidatePath("/admin/warteliste");
}
