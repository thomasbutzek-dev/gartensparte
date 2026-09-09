"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireMoneyWrite } from "@/lib/auth";
import { getSettings, nextInvoiceNumber, formatEuro } from "@/lib/settings";
import { createLetter, getTemplate, germanDate, memberAddress } from "@/lib/letters";
import { fillTemplate, type InvoiceRow } from "@/lib/pdf";
import { parseDateInput, today } from "@/lib/format";
import { missingWorkHours } from "@/lib/work-hours";

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
  type: z.enum(["beitrag", "pacht", "strom", "arbeitsstunden", "umlage", "sonstiges"]),
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
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect("/admin/schriftverkehr?fehler=jahr");

  const settings = getSettings();
  const dueDate = addDays(today(), settings.zahlungszielTage);
  const template = getTemplate("rechnung");
  if (!template) redirect("/admin/schriftverkehr?fehler=vorlage");

  // Aktive Pachtverhältnisse mit Mitglied und Garten
  const tenancies = db
    .select({
      memberId: tables.members.id,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
      street: tables.members.street,
      zip: tables.members.zip,
      city: tables.members.city,
      memberStatus: tables.members.status,
      gardenId: tables.gardens.id,
      gardenNumber: tables.gardens.number,
      sizeSqm: tables.gardens.sizeSqm,
    })
    .from(tables.tenancies)
    .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
    .innerJoin(tables.gardens, eq(tables.tenancies.gardenId, tables.gardens.id))
    .where(isNull(tables.tenancies.endDate))
    .orderBy(asc(tables.gardens.number))
    .all();

  const readings = db.select().from(tables.meterReadings).orderBy(asc(tables.meterReadings.date), asc(tables.meterReadings.id)).all();
  const prevYearHours = db.select().from(tables.workHours).all().filter((h) => h.date.startsWith(String(year - 1)));
  const prevYearExempt = new Set(
    db.select().from(tables.workExemptions).where(eq(tables.workExemptions.year, year - 1)).all().map((row) => row.memberId),
  );
  const existing = db.select().from(tables.payments).where(eq(tables.payments.year, year)).all();

  // Nach Mitglied gruppieren (ein Mitglied kann mehrere Gärten haben)
  const byMember = new Map<number, typeof tenancies>();
  for (const t of tenancies) {
    if (t.memberStatus !== "aktiv") continue;
    byMember.set(t.memberId, [...(byMember.get(t.memberId) ?? []), t]);
  }

  let created = 0;
  let skipped = 0;

  for (const [memberId, memberGardens] of byMember) {
    // Idempotenz: Wer für das Jahr schon einen Beitrag berechnet bekam, wird übersprungen
    if (existing.some((p) => p.memberId === memberId && p.type === "beitrag")) {
      skipped++;
      continue;
    }
    const first = memberGardens[0];
    const rows: (InvoiceRow & { type: "beitrag" | "pacht" | "strom" | "arbeitsstunden" | "umlage"; gardenId: number | null })[] = [];

    rows.push({ label: `Mitgliedsbeitrag ${year}`, amountCents: settings.mitgliedsbeitragCents, type: "beitrag", gardenId: null });

    for (const g of memberGardens) {
      if (g.sizeSqm && settings.pachtCentProQm > 0) {
        rows.push({
          label: `Pacht ${year} Garten ${g.gardenNumber} (${g.sizeSqm} m² × ${formatEuro(settings.pachtCentProQm)})`,
          amountCents: Math.round(g.sizeSqm * settings.pachtCentProQm),
          type: "pacht",
          gardenId: g.gardenId,
        });
      }
      // Strom: Verbrauch = letzter Stand im Vorjahr bis letzter Stand im Abrechnungsjahr
      const gardenReadings = readings.filter((r) => r.gardenId === g.gardenId);
      const startReading = [...gardenReadings].reverse().find((r) => r.date < `${year}-01-01`);
      const endReading = [...gardenReadings].reverse().find((r) => r.date >= `${year}-01-01` && r.date <= `${year}-12-31`);
      if (startReading && endReading && endReading.value >= startReading.value) {
        const kwh = endReading.value - startReading.value;
        const cents = Math.round(kwh * settings.stromCentProKwh) + settings.stromGrundgebuehrCents;
        rows.push({
          label: `Strom ${year} Garten ${g.gardenNumber} (${kwh.toLocaleString("de-DE")} kWh + Grundgebühr)`,
          amountCents: cents,
          type: "strom",
          gardenId: g.gardenId,
        });
      }
    }

    if (settings.umlageCents > 0) {
      rows.push({ label: `${settings.umlageBezeichnung} ${year}`, amountCents: settings.umlageCents, type: "umlage", gardenId: null });
    }

    // Fehlende Arbeitsstunden aus dem Vorjahr
    if (settings.arbeitsstundenSoll > 0 && settings.arbeitsstundenSatzCents > 0) {
      const done = prevYearHours.filter((h) => h.memberId === memberId).reduce((sum, h) => sum + h.hours, 0);
      const missing = missingWorkHours(done, prevYearExempt.has(memberId), settings.arbeitsstundenSoll);
      if (missing > 0) {
        rows.push({
          label: `Fehlende Arbeitsstunden ${year - 1} (${missing} h × ${formatEuro(settings.arbeitsstundenSatzCents)})`,
          amountCents: Math.round(missing * settings.arbeitsstundenSatzCents),
          type: "arbeitsstunden",
          gardenId: null,
        });
      }
    }

    const totalCents = rows.reduce((sum, row) => sum + row.amountCents, 0);
    const invoiceNumber = nextInvoiceNumber(year);
    const values = {
      name: `${first.firstName} ${first.lastName}`,
      jahr: String(year),
      garten_nummer: memberGardens.map((g) => g.gardenNumber).join(", "),
      betrag: formatEuro(totalCents),
      frist: germanDate(new Date(dueDate)),
      verein: settings.vereinName,
      rechnungsnummer: invoiceNumber,
      positionen: "", // Positionen stehen in der Tabelle unter dem Text
    };

    const letterId = await createLetter({
      type: "rechnung",
      number: invoiceNumber,
      memberId,
      gardenId: first.gardenId,
      recipient: memberAddress(first),
      subject: fillTemplate(template.subject, values),
      body: fillTemplate(template.body, values).replace(/\n{3,}/g, "\n\n"),
      table: { rows, totalLabel: "Gesamtbetrag" },
      createdBy: user.id,
    });

    for (const row of rows) {
      db.insert(tables.payments)
        .values({
          memberId,
          gardenId: row.gardenId,
          year,
          type: row.type,
          description: row.label,
          amountCents: row.amountCents,
          dueDate,
          letterId,
        })
        .run();
    }
    created++;
  }

  revalidatePath("/admin/zahlungen");
  revalidatePath("/admin/schriftverkehr");
  redirect(`/admin/schriftverkehr?lauf=${created}&uebersprungen=${skipped}`);
}
