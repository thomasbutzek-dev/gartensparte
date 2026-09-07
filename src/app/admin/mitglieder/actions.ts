"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireUser, requireAdminRole } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/format";

const memberSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  street: z.string().trim().max(200).default(""),
  zip: z.string().trim().max(10).default(""),
  city: z.string().trim().max(100).default(""),
  phone: z.string().trim().max(100).default(""),
  email: z.string().trim().max(200).default(""),
  memberSince: z.string().trim().max(10).default(""),
  note: z.string().trim().max(2000).default(""),
});

function parseMember(formData: FormData) {
  return memberSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    street: formData.get("street"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    memberSince: parseDateInput(String(formData.get("memberSince") ?? "")) ?? "",
    note: formData.get("note"),
  });
}

export async function createMember(formData: FormData) {
  await requireUser();
  const data = parseMember(formData);
  const inserted = db
    .insert(tables.members)
    .values({ ...data, memberSince: data.memberSince || null })
    .returning({ id: tables.members.id })
    .get();
  revalidatePath("/admin/mitglieder");
  redirect(`/admin/mitglieder/${inserted.id}`);
}

export async function updateMember(memberId: number, formData: FormData) {
  await requireUser();
  const data = parseMember(formData);
  db.update(tables.members)
    .set({ ...data, memberSince: data.memberSince || null })
    .where(eq(tables.members.id, memberId))
    .run();
  revalidatePath(`/admin/mitglieder/${memberId}`);
  redirect(`/admin/mitglieder/${memberId}?ok=1`);
}

export async function setMemberStatus(memberId: number, formData: FormData) {
  await requireUser();
  const status = String(formData.get("status")) === "ausgeschieden" ? "ausgeschieden" : "aktiv";
  db.update(tables.members)
    .set({ status, leftAt: status === "ausgeschieden" ? today() : null })
    .where(eq(tables.members.id, memberId))
    .run();
  revalidatePath(`/admin/mitglieder/${memberId}`);
}

/** Endgültig löschen (nur Admin, nur ohne Pachtverhältnisse/Zahlungen). */
export async function deleteMember(memberId: number) {
  await requireAdminRole();
  const hasTenancy = db.select().from(tables.tenancies).where(eq(tables.tenancies.memberId, memberId)).all().length > 0;
  const hasPayments = db.select().from(tables.payments).where(eq(tables.payments.memberId, memberId)).all().length > 0;
  if (hasTenancy || hasPayments) {
    redirect(`/admin/mitglieder/${memberId}?fehler=verknuepft`);
  }
  db.delete(tables.workHours).where(eq(tables.workHours.memberId, memberId)).run();
  db.delete(tables.members).where(eq(tables.members.id, memberId)).run();
  revalidatePath("/admin/mitglieder");
  redirect("/admin/mitglieder");
}
