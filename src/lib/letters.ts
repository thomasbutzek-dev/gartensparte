import "server-only";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, lettersDir, tables } from "@/db";
import { getSettings } from "@/lib/settings";
import { renderLetterPdf, type InvoiceRow } from "@/lib/pdf";
import { nowIso } from "@/lib/format";

export type LetterType = "rechnung" | "mahnung" | "kuendigung" | "rundschreiben";

export function getTemplate(type: "rechnung" | "mahnung1" | "mahnung2" | "kuendigung" | "rundschreiben") {
  return db.select().from(tables.letterTemplates).where(eq(tables.letterTemplates.type, type)).get();
}

export function memberAddress(member: { firstName: string; lastName: string; street: string; zip: string; city: string }): string[] {
  return [
    `${member.firstName} ${member.lastName}`,
    member.street,
    [member.zip, member.city].filter(Boolean).join(" "),
  ].filter(Boolean);
}

export function germanDate(date = new Date()): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Brief-PDF erzeugen, speichern und in der Datenbank registrieren. Gibt die Brief-ID zurück. */
export async function createLetter(options: {
  type: LetterType;
  number?: string | null;
  memberId?: number | null;
  gardenId?: number | null;
  recipient: string[];
  subject: string;
  body: string;
  table?: { rows: InvoiceRow[]; totalLabel: string };
  createdBy: number;
  /** Bereits fertige PDF-Bytes (z.B. Sammel-PDF) statt Einzelrendering */
  pdfBytes?: Uint8Array;
}): Promise<number> {
  const settings = getSettings();
  const bytes =
    options.pdfBytes ??
    (await renderLetterPdf({
      settings,
      recipient: options.recipient,
      date: germanDate(),
      subject: options.subject,
      body: options.body,
      table: options.table,
    }));

  const inserted = db
    .insert(tables.letters)
    .values({
      type: options.type,
      number: options.number ?? null,
      memberId: options.memberId ?? null,
      gardenId: options.gardenId ?? null,
      subject: options.subject,
      fileName: "pending.pdf",
      createdAt: nowIso(),
      createdBy: options.createdBy,
    })
    .returning({ id: tables.letters.id })
    .get();

  const fileName = `${inserted.id}-${options.type}${options.number ? `-${options.number}` : ""}.pdf`;
  await writeFile(join(lettersDir, fileName), bytes);
  db.update(tables.letters).set({ fileName }).where(eq(tables.letters.id, inserted.id)).run();
  return inserted.id;
}
