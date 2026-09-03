"use server";

import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, lettersDir, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { createLetter, getTemplate, germanDate, memberAddress } from "@/lib/letters";
import { fillTemplate, mergePdfs, renderLetterPdf } from "@/lib/pdf";
import { nowIso } from "@/lib/format";

export async function createTermination(formData: FormData) {
  const user = await requireUser();
  const [memberId, gardenId] = String(formData.get("paar") ?? "").split(":").map(Number);
  const deadline = String(formData.get("frist") ?? "").trim();
  const reason = String(formData.get("grund") ?? "").trim();
  if (!memberId || !gardenId || !deadline) redirect("/admin/schriftverkehr?fehler=eingabe");

  const member = db.select().from(tables.members).where(eq(tables.members.id, memberId)).get();
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, gardenId)).get();
  const template = getTemplate("kuendigung");
  if (!member || !garden || !template) redirect("/admin/schriftverkehr?fehler=eingabe");

  const settings = getSettings();
  const values = {
    name: `${member.firstName} ${member.lastName}`,
    garten_nummer: String(garden.number),
    frist: germanDate(new Date(deadline)),
    grund: reason || "–",
    verein: settings.vereinName,
  };

  const letterId = await createLetter({
    type: "kuendigung",
    memberId,
    gardenId,
    recipient: memberAddress(member),
    subject: fillTemplate(template.subject, values),
    body: fillTemplate(template.body, values),
    createdBy: user.id,
  });

  db.update(tables.gardens).set({ status: "kuendigung" }).where(eq(tables.gardens.id, gardenId)).run();
  db.insert(tables.gardenNotes)
    .values({ gardenId, date: nowIso().slice(0, 10), authorId: user.id, text: `Kündigung zum ${values.frist} erstellt.` })
    .run();

  revalidatePath("/admin/schriftverkehr");
  redirect(`/admin/schriftverkehr?ok=${letterId}&hinweis=schriftform`);
}

export async function createCircular(formData: FormData) {
  const user = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!subject || !text) redirect("/admin/schriftverkehr?fehler=eingabe");

  const settings = getSettings();
  const template = getTemplate("rundschreiben");
  const members = db
    .select()
    .from(tables.members)
    .where(eq(tables.members.status, "aktiv"))
    .orderBy(asc(tables.members.lastName), asc(tables.members.firstName))
    .all();
  if (members.length === 0) redirect("/admin/schriftverkehr?fehler=mitglieder");

  const pdfs: Uint8Array[] = [];
  for (const member of members) {
    const values = {
      name: `${member.firstName} ${member.lastName}`,
      text,
      verein: settings.vereinName,
    };
    pdfs.push(
      await renderLetterPdf({
        settings,
        recipient: memberAddress(member),
        date: germanDate(),
        subject: template ? fillTemplate(template.subject, values) : subject,
        body: template ? fillTemplate(template.body, values) : text,
      }),
    );
  }

  const merged = await mergePdfs(pdfs);
  const letterId = await createLetter({
    type: "rundschreiben",
    recipient: [],
    subject: `${subject} (${members.length} Empfänger)`,
    body: text,
    createdBy: user.id,
    pdfBytes: merged,
  });

  revalidatePath("/admin/schriftverkehr");
  redirect(`/admin/schriftverkehr?ok=${letterId}`);
}

export async function deleteLetter(letterId: number) {
  await requireUser();
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, letterId)).get();
  if (letter) {
    db.update(tables.payments).set({ letterId: null }).where(eq(tables.payments.letterId, letterId)).run();
    db.delete(tables.letters).where(eq(tables.letters.id, letterId)).run();
    await unlink(join(lettersDir, letter.fileName)).catch(() => {});
  }
  revalidatePath("/admin/schriftverkehr");
}

export async function updateTemplate(templateId: number, formData: FormData) {
  await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) redirect("/admin/schriftverkehr/vorlagen?fehler=1");
  db.update(tables.letterTemplates)
    .set({ subject, body, updatedAt: nowIso() })
    .where(eq(tables.letterTemplates.id, templateId))
    .run();
  revalidatePath("/admin/schriftverkehr/vorlagen");
  redirect("/admin/schriftverkehr/vorlagen?ok=1");
}
