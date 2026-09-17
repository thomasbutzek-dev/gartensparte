"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireMoneyWrite } from "@/lib/auth";
import { runAnnualInvoiceYear } from "@/lib/annual-invoices";
import { renderInvoiceJobs } from "@/lib/letters";
import { formatEuro, getSettings } from "@/lib/settings";
import { createLetter, getTemplate, germanDate, memberAddress } from "@/lib/letters";
import { fillTemplate } from "@/lib/pdf";
import { parseDateInput, today } from "@/lib/format";

function euroToCents(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ---------- Einzelne Posten ----------

const paymentSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(2000).max(2100),
  type: z.enum(["beitrag", "pacht", "strom", "wasser", "arbeitsstunden", "umlage", "sonstiges"]),
  description: z.string().trim().max(300).default(""),
  dueDate: z.string().trim().max(10).default(""),
});

export async function addPayment(formData: FormData) {
  await requireMoneyWrite();
  const amountCents = euroToCents(formData.get("amount"));
  const parsed = paymentSchema.safeParse({
    memberId: formData.get("memberId"),
    year: formData.get("year"),
    type: formData.get("type"),
    description: formData.get("description"),
    dueDate: parseDateInput(String(formData.get("dueDate") ?? "")) ?? "",
  });
  if (!parsed.success || amountCents === null || amountCents === 0) redirect("/admin/zahlungen?fehler=eingabe");
  const gardenId = Number(formData.get("gardenId") || 0) || null;
  db.insert(tables.payments)
    .values({ ...parsed.data, gardenId, amountCents, dueDate: parsed.data.dueDate || null })
    .run();
  revalidatePath("/admin/zahlungen");
  redirect("/admin/zahlungen?ok=posten");
}

export async function markPaid(paymentId: number, formData: FormData) {
  await requireMoneyWrite();
  const payment = db.select().from(tables.payments).where(eq(tables.payments.id, paymentId)).get();
  if (!payment) redirect("/admin/zahlungen");
  const amountCents = euroToCents(formData.get("amount")) ?? payment.amountCents - payment.paidCents;
  const newPaid = Math.min(payment.amountCents, payment.paidCents + amountCents);
  db.update(tables.payments)
    .set({
      paidCents: newPaid,
      paidAt: newPaid >= payment.amountCents ? parseDateInput(String(formData.get("paidAt") ?? "")) || today() : payment.paidAt,
    })
    .where(eq(tables.payments.id, paymentId))
    .run();
  revalidatePath("/admin/zahlungen");
  redirect("/admin/zahlungen?ok=zahlung");
}

export async function reopenPayment(paymentId: number) {
  await requireMoneyWrite();
  db.update(tables.payments).set({ paidCents: 0, paidAt: null }).where(eq(tables.payments.id, paymentId)).run();
  revalidatePath("/admin/zahlungen");
}

export async function deletePayment(paymentId: number) {
  await requireMoneyWrite();
  db.delete(tables.payments).where(eq(tables.payments.id, paymentId)).run();
  revalidatePath("/admin/zahlungen");
}

// ---------- Mahnung ----------

export async function dunPayment(paymentId: number) {
  const user = await requireMoneyWrite();
  const payment = db.select().from(tables.payments).where(eq(tables.payments.id, paymentId)).get();
  if (!payment || payment.paidCents >= payment.amountCents) redirect("/admin/zahlungen");
  const member = db.select().from(tables.members).where(eq(tables.members.id, payment.memberId)).get();
  if (!member) redirect("/admin/zahlungen");

  const settings = getSettings();
  const level = Math.min(2, payment.dunningLevel + 1);
  const template = getTemplate(level === 1 ? "mahnung1" : "mahnung2");
  if (!template) redirect("/admin/zahlungen?fehler=vorlage");

  const openCents = payment.amountCents - payment.paidCents;
  const values = {
    name: `${member.firstName} ${member.lastName}`,
    beschreibung: payment.description || `${payment.type} ${payment.year}`,
    betrag: formatEuro(openCents),
    faellig: payment.dueDate ? germanDate(new Date(payment.dueDate)) : "–",
    frist: germanDate(new Date(addDays(today(), 14))),
    verein: settings.vereinName,
  };

  const letterId = await createLetter({
    type: "mahnung",
    number: `zahlung-${payment.id}`,
    memberId: member.id,
    gardenId: payment.gardenId,
    recipient: memberAddress(member),
    subject: fillTemplate(template.subject, values),
    body: fillTemplate(template.body, values),
    createdBy: user.id,
    status: "entwurf",
  });

  revalidatePath("/admin/zahlungen");
  revalidatePath("/admin/schriftverkehr");
  redirect(`/admin/schriftverkehr/${letterId}`);
}

// ---------- Jahres-Rechnungslauf ----------

export async function runAnnualInvoices(formData: FormData) {
  const user = await requireMoneyWrite();
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect("/admin/zahlungen?fehler=jahr");
  if (formData.get("bestaetigt") !== "1") redirect(`/admin/zahlungen?jahr=${year}&fehler=bestaetigung`);
  if (!getTemplate("rechnung")) redirect("/admin/zahlungen?fehler=vorlage");

  const { created, skipped, jobs } = await runAnnualInvoiceYear(year, user.id, { deferPdf: true });
  after(() => renderInvoiceJobs(jobs));
  revalidatePath("/admin/zahlungen");
  revalidatePath("/admin/schriftverkehr");
  redirect(`/admin/zahlungen?jahr=${year}&lauf=${created}&uebersprungen=${skipped}`);
}
