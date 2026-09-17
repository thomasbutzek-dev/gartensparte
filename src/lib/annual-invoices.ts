import "server-only";
import { asc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { createLetter, germanDate, getTemplate, memberAddress, renderInvoiceJobs, type InvoicePdfJob } from "@/lib/letters";
import { fillTemplate, type InvoiceRow } from "@/lib/pdf";
import { formatEuro, getSettings, nextInvoiceNumber } from "@/lib/settings";
import { missingWorkHours, tenancyOverlapsYear } from "@/lib/work-hours";
import { today } from "@/lib/format";
import type { MeterKind } from "@/lib/readings";

type BillableGarden = {
  memberId: number;
  firstName: string;
  lastName: string;
  street: string;
  zip: string;
  city: string;
  gardenId: number;
  gardenNumber: number;
  sizeSqm: number | null;
};

export type AnnualInvoicePreview = {
  year: number;
  members: number;
  alreadyBilled: number;
  toCreate: number;
};

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function listBillableByMember() {
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

  const byMember = new Map<number, BillableGarden[]>();
  for (const row of tenancies) {
    if (row.memberStatus !== "aktiv") continue;
    byMember.set(row.memberId, [...(byMember.get(row.memberId) ?? []), row]);
  }
  return byMember;
}

type MeterReadingRow = { gardenId: number; date: string; value: number; kind: string };

function yearConsumption(readings: MeterReadingRow[], gardenId: number, year: number, kind: MeterKind): number | null {
  const gardenReadings = readings.filter((row) => row.gardenId === gardenId && row.kind === kind);
  const startReading = [...gardenReadings].reverse().find((row) => row.date < `${year}-01-01`);
  const endReading = [...gardenReadings].reverse().find((row) => row.date >= `${year}-01-01` && row.date <= `${year}-12-31`);
  if (!startReading || !endReading || endReading.value < startReading.value) return null;
  return endReading.value - startReading.value;
}

function billedMemberIds(year: number): Set<number> {
  return new Set(
    db
      .select()
      .from(tables.payments)
      .where(eq(tables.payments.year, year))
      .all()
      .filter((payment) => payment.type === "beitrag")
      .map((payment) => payment.memberId),
  );
}

/** Zählt, wen der Jahreslauf treffen würde, ohne etwas zu schreiben. */
export function previewAnnualInvoices(year: number): AnnualInvoicePreview {
  const byMember = listBillableByMember();
  const billed = billedMemberIds(year);
  let alreadyBilled = 0;
  for (const memberId of byMember.keys()) {
    if (billed.has(memberId)) alreadyBilled++;
  }
  return {
    year,
    members: byMember.size,
    alreadyBilled,
    toCreate: byMember.size - alreadyBilled,
  };
}

export type AnnualInvoiceResult = { created: number; skipped: number; jobs: InvoicePdfJob[] };

/** Erzeugt Posten und Rechnungs-PDFs für alle noch nicht abgerechneten Pächter. */
export async function runAnnualInvoiceYear(
  year: number,
  createdBy: number,
  options?: { deferPdf?: boolean },
): Promise<AnnualInvoiceResult> {
  const settings = getSettings();
  const dueDate = addDays(today(), settings.zahlungszielTage);
  const template = getTemplate("rechnung");
  if (!template) return { created: 0, skipped: 0, jobs: [] };

  const byMember = listBillableByMember();
  const billed = billedMemberIds(year);
  const readings = db.select().from(tables.meterReadings).orderBy(asc(tables.meterReadings.date), asc(tables.meterReadings.id)).all();
  const yearHours = db.select().from(tables.workHours).all().filter((row) => row.date.startsWith(String(year)));
  const yearExempt = new Set(
    db.select().from(tables.workExemptions).where(eq(tables.workExemptions.year, year)).all().map((row) => row.memberId),
  );
  const tenancyInYear = new Set(
    db
      .select({
        memberId: tables.tenancies.memberId,
        startDate: tables.tenancies.startDate,
        endDate: tables.tenancies.endDate,
      })
      .from(tables.tenancies)
      .all()
      .filter((row) => tenancyOverlapsYear(row.startDate, row.endDate, year))
      .map((row) => row.memberId),
  );

  let created = 0;
  let skipped = 0;
  const jobs: InvoicePdfJob[] = [];

  for (const [memberId, memberGardens] of byMember) {
    if (billed.has(memberId)) {
      skipped++;
      continue;
    }
    const first = memberGardens[0];
    const rows: (InvoiceRow & { type: "beitrag" | "pacht" | "strom" | "wasser" | "arbeitsstunden" | "umlage"; gardenId: number | null })[] = [];

    rows.push({ label: `Mitgliedsbeitrag ${year}`, amountCents: settings.mitgliedsbeitragCents, type: "beitrag", gardenId: null });

    for (const garden of memberGardens) {
      if (garden.sizeSqm && settings.pachtCentProQm > 0) {
        rows.push({
          label: `Pacht ${year} Garten ${garden.gardenNumber} (${garden.sizeSqm} m² × ${formatEuro(settings.pachtCentProQm)})`,
          amountCents: Math.round(garden.sizeSqm * settings.pachtCentProQm),
          type: "pacht",
          gardenId: garden.gardenId,
        });
      }
      const kwh = yearConsumption(readings, garden.gardenId, year, "strom");
      if (kwh !== null) {
        const cents = Math.round(kwh * settings.stromCentProKwh) + settings.stromGrundgebuehrCents;
        rows.push({
          label: `Strom ${year} Garten ${garden.gardenNumber} (${kwh.toLocaleString("de-DE")} kWh + Grundgebühr)`,
          amountCents: cents,
          type: "strom",
          gardenId: garden.gardenId,
        });
      }
      const cubicMeters = yearConsumption(readings, garden.gardenId, year, "wasser");
      if (cubicMeters !== null && (settings.wasserCentProM3 > 0 || settings.wasserGrundgebuehrCents > 0)) {
        const cents = Math.round(cubicMeters * settings.wasserCentProM3) + settings.wasserGrundgebuehrCents;
        rows.push({
          label: `Wasser ${year} Garten ${garden.gardenNumber} (${cubicMeters.toLocaleString("de-DE")} m³ + Grundgebühr)`,
          amountCents: cents,
          type: "wasser",
          gardenId: garden.gardenId,
        });
      }
    }

    if (settings.umlageCents > 0) {
      rows.push({ label: `${settings.umlageBezeichnung} ${year}`, amountCents: settings.umlageCents, type: "umlage", gardenId: null });
    }

    if (settings.arbeitsstundenSoll > 0 && settings.arbeitsstundenSatzCents > 0 && tenancyInYear.has(memberId)) {
      const done = yearHours.filter((row) => row.memberId === memberId).reduce((sum, row) => sum + row.hours, 0);
      const missing = missingWorkHours(done, yearExempt.has(memberId), settings.arbeitsstundenSoll);
      if (missing > 0) {
        rows.push({
          label: `Fehlende Arbeitsstunden ${year} (${missing} h × ${formatEuro(settings.arbeitsstundenSatzCents)})`,
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
      garten_nummer: memberGardens.map((garden) => garden.gardenNumber).join(", "),
      betrag: formatEuro(totalCents),
      frist: germanDate(new Date(dueDate)),
      verein: settings.vereinName,
      rechnungsnummer: invoiceNumber,
      positionen: "",
    };

    const subject = fillTemplate(template.subject, values);
    const body = fillTemplate(template.body, values).replace(/\n{3,}/g, "\n\n");
    const table = { rows, totalLabel: "Gesamtbetrag" };
    const recipient = memberAddress(first);
    const letterId = await createLetter({
      type: "rechnung",
      number: invoiceNumber,
      memberId,
      gardenId: first.gardenId,
      recipient,
      subject,
      body,
      table,
      createdBy,
      skipPdf: true,
    });
    jobs.push({ letterId, recipient, subject, body, table });

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
    billed.add(memberId);
    created++;
  }

  if (!options?.deferPdf) await renderInvoiceJobs(jobs);
  return { created, skipped, jobs };
}
