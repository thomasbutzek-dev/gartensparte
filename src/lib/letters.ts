import "server-only";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { asc, eq } from "drizzle-orm";
import { db, lettersDir, tables } from "@/db";
import { getSettings } from "@/lib/settings";
import { renderLetterPdf, mergePdfs, type InvoiceRow } from "@/lib/pdf";
import { nowIso } from "@/lib/format";

export type LetterType = string;

export function getTemplate(type: string) {
  return db.select().from(tables.letterTemplates).where(eq(tables.letterTemplates.type, type)).get();
}

export function getTemplateById(id: number) {
  return db.select().from(tables.letterTemplates).where(eq(tables.letterTemplates.id, id)).get();
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
  status?: "entwurf" | "fertig";
  pdfBytes?: Uint8Array;
}): Promise<number> {
  const status = options.status ?? "fertig";
  const inserted = db
    .insert(tables.letters)
    .values({
      type: options.type,
      number: options.number ?? null,
      memberId: options.memberId ?? null,
      gardenId: options.gardenId ?? null,
      subject: options.subject,
      body: options.body,
      fileName: status === "entwurf" ? "" : "pending.pdf",
      status,
      createdAt: nowIso(),
      createdBy: options.createdBy,
    })
    .returning({ id: tables.letters.id })
    .get();

  if (status === "entwurf") return inserted.id;

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

  const fileName = `${inserted.id}-${options.type}${options.number ? `-${options.number}` : ""}.pdf`;
  await writeFile(join(lettersDir, fileName), bytes);
  db.update(tables.letters).set({ fileName }).where(eq(tables.letters.id, inserted.id)).run();
  return inserted.id;
}

export async function writeFinalPdf(letterId: number): Promise<{ ok: true } | { error: string }> {
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, letterId)).get();
  if (!letter) return { error: "fehlt" };
  if (!letter.subject.trim() || !letter.body.trim()) return { error: "leer" };

  const settings = getSettings();

  if (letter.type === "rundschreiben") {
    const members = db
      .select()
      .from(tables.members)
      .where(eq(tables.members.status, "aktiv"))
      .orderBy(asc(tables.members.lastName), asc(tables.members.firstName))
      .all();
    if (members.length === 0) return { error: "mitglieder" };
    const pdfs: Uint8Array[] = [];
    for (const member of members) {
      const body = letter.body.replaceAll("{{name}}", `${member.firstName} ${member.lastName}`);
      const subject = letter.subject.replaceAll("{{name}}", `${member.firstName} ${member.lastName}`);
      pdfs.push(
        await renderLetterPdf({
          settings,
          recipient: memberAddress(member),
          date: germanDate(),
          subject,
          body,
        }),
      );
    }
    const merged = await mergePdfs(pdfs);
    const fileName = `${letter.id}-rundschreiben.pdf`;
    await writeFile(join(lettersDir, fileName), merged);
    db.update(tables.letters)
      .set({
        fileName,
        status: "fertig",
        subject: letter.subject.includes("Empfänger") ? letter.subject : `${letter.subject} (${members.length} Empfänger)`,
      })
      .where(eq(tables.letters.id, letter.id))
      .run();
    return { ok: true };
  }

  const member = letter.memberId
    ? db.select().from(tables.members).where(eq(tables.members.id, letter.memberId)).get()
    : null;
  const bytes = await renderLetterPdf({
    settings,
    recipient: member ? memberAddress(member) : [],
    date: germanDate(),
    subject: letter.subject,
    body: letter.body,
  });
  const fileName = `${letter.id}-${letter.type}${letter.number ? `-${letter.number}` : ""}.pdf`;
  await writeFile(join(lettersDir, fileName), bytes);
  db.update(tables.letters).set({ fileName, status: "fertig" }).where(eq(tables.letters.id, letter.id)).run();
  return { ok: true };
}
