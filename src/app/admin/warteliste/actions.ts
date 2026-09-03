"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";

export async function setApplicantStatus(applicantId: number, formData: FormData) {
  await requireUser();
  const status = z.enum(["offen", "kontaktiert", "vergeben", "zurueckgezogen"]).parse(formData.get("status"));
  db.update(tables.applicants).set({ status }).where(eq(tables.applicants.id, applicantId)).run();
  revalidatePath("/admin/warteliste");
}

export async function saveApplicantNote(applicantId: number, formData: FormData) {
  await requireUser();
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  db.update(tables.applicants).set({ note }).where(eq(tables.applicants.id, applicantId)).run();
  revalidatePath("/admin/warteliste");
}

export async function deleteApplicant(applicantId: number) {
  await requireUser();
  db.delete(tables.applicants).where(eq(tables.applicants.id, applicantId)).run();
  revalidatePath("/admin/warteliste");
}
