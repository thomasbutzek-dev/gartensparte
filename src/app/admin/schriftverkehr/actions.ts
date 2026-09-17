"use server";

import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, lettersDir, tables } from "@/db";
import { requireLetterWrite, requireTemplateWrite, requireWrite } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { createLetter, getTemplateById, germanDate, writeFinalPdf } from "@/lib/letters";
import { archiveTypeFor, isMoneyLetterGroup, isMoneyLetterType } from "@/lib/letter-catalog";
import { fillTemplate } from "@/lib/pdf";
import { formatDate, nowIso, parseDateInput, today } from "@/lib/format";
import { deleteStoredFile } from "@/lib/form";

function draftValues(formData: FormData): Record<string, string> {
  const settings = getSettings();
  const deadline = parseDateInput(String(formData.get("frist") ?? ""));
  return {
    frist: deadline ? formatDate(deadline) : "",
    grund: String(formData.get("grund") ?? "").trim() || "–",
    sachverhalt: String(formData.get("sachverhalt") ?? "").trim() || "–",
    verein: settings.vereinName,
    datum: germanDate(),
    text: String(formData.get("text") ?? "").trim(),
    beschreibung: String(formData.get("beschreibung") ?? "").trim() || "–",
    betrag: String(formData.get("betrag") ?? "").trim() || "–",
    faellig: String(formData.get("faellig") ?? "").trim() || "–",
  };
}

export async function startLetter(formData: FormData) {
  const template = getTemplateById(Number(formData.get("templateId")));
  if (!template) redirect("/admin/schriftverkehr?fehler=vorlage");
  const user = await requireTemplateWrite(template.letterGroup);
  const missing = isMoneyLetterGroup(template.letterGroup)
    ? "/admin/zahlungen?fehler=brief"
    : "/admin/schriftverkehr?fehler=eingabe";

  const values = draftValues(formData);
  let memberId: number | null = null;
  let gardenId: number | null = null;

  if (template.letterGroup !== "rundschreiben") {
    const [rawMember, rawGarden] = String(formData.get("paar") ?? "").split(":").map(Number);
    if (!rawMember || !rawGarden) redirect(missing);
    const member = db.select().from(tables.members).where(eq(tables.members.id, rawMember)).get();
    const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, rawGarden)).get();
    if (!member || !garden) redirect(missing);
    memberId = member.id;
    gardenId = garden.id;
    values.name = `${member.firstName} ${member.lastName}`;
    values.garten_nummer = String(garden.number);
  } else if (!values.text) {
    redirect(missing);
  }

  const subjectOverride = String(formData.get("subject") ?? "").trim();
  const letterId = await createLetter({
    type: template.effect === "kuendigung" ? "kuendigung" : archiveTypeFor(template),
    memberId,
    gardenId,
    recipient: [],
    subject: subjectOverride || fillTemplate(template.subject, values),
    body: fillTemplate(template.body, values),
    createdBy: user.id,
    status: "entwurf",
  });

  revalidatePath("/admin/schriftverkehr");
  revalidatePath("/admin/zahlungen");
  redirect(`/admin/schriftverkehr/${letterId}`);
}

export async function saveDraft(letterId: number, formData: FormData) {
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, letterId)).get();
  if (!letter || letter.status !== "entwurf") redirect("/admin/schriftverkehr");
  await requireLetterWrite(letter.type);
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) redirect(`/admin/schriftverkehr/${letterId}?fehler=leer`);
  db.update(tables.letters).set({ subject, body }).where(eq(tables.letters.id, letterId)).run();
  revalidatePath(`/admin/schriftverkehr/${letterId}`);
  redirect(`/admin/schriftverkehr/${letterId}?ok=entwurf`);
}

export async function finalizeLetter(letterId: number, formData: FormData) {
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, letterId)).get();
  if (!letter || letter.status !== "entwurf") redirect("/admin/schriftverkehr");
  const user = await requireLetterWrite(letter.type);
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) redirect(`/admin/schriftverkehr/${letterId}?fehler=leer`);
  db.update(tables.letters).set({ subject, body }).where(eq(tables.letters.id, letterId)).run();

  const written = await writeFinalPdf(letterId);
  if ("error" in written) {
    if (written.error === "mitglieder") redirect(`/admin/schriftverkehr/${letterId}?fehler=mitglieder`);
    redirect(`/admin/schriftverkehr/${letterId}?fehler=leer`);
  }

  const effect = String(formData.get("effect") ?? "");
  if (effect === "kuendigung" && letter.gardenId) {
    db.update(tables.gardens).set({ status: "kuendigung" }).where(eq(tables.gardens.id, letter.gardenId)).run();
  }
  if (letter.gardenId) {
    db.insert(tables.gardenNotes)
      .values({
        gardenId: letter.gardenId,
        date: today(),
        authorId: user.id,
        text: `Schreiben: ${subject}`,
      })
      .run();
  }

  const paymentRef = letter.number?.match(/^zahlung-(\d+)$/);
  if (paymentRef) {
    const paymentId = Number(paymentRef[1]);
    const payment = db.select().from(tables.payments).where(eq(tables.payments.id, paymentId)).get();
    if (payment) {
      db.update(tables.payments)
        .set({
          dunningLevel: Math.min(2, payment.dunningLevel + 1),
          dunnedAt: today(),
          letterId,
        })
        .where(eq(tables.payments.id, paymentId))
        .run();
    }
  }

  revalidatePath("/admin/schriftverkehr");
  revalidatePath("/admin/gaerten");
  revalidatePath("/admin/zahlungen");
  const hint = letter.type === "kuendigung" ? "&hinweis=schriftform" : "";
  if (isMoneyLetterType(letter.type)) redirect(`/admin/zahlungen?brief=${letterId}`);
  redirect(`/admin/schriftverkehr?ok=${letterId}${hint}`);
}

export async function deleteLetter(letterId: number) {
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, letterId)).get();
  if (letter) await requireLetterWrite(letter.type);
  else await requireWrite();
  if (letter) {
    db.update(tables.payments).set({ letterId: null }).where(eq(tables.payments.letterId, letterId)).run();
    db.delete(tables.letters).where(eq(tables.letters.id, letterId)).run();
    if (letter.fileName) await deleteStoredFile(join(lettersDir, letter.fileName));
  }
  revalidatePath("/admin/schriftverkehr");
  revalidatePath("/admin/zahlungen");
}

export async function updateTemplate(templateId: number, formData: FormData) {
  const template = db.select().from(tables.letterTemplates).where(eq(tables.letterTemplates.id, templateId)).get();
  if (!template) redirect("/admin/schriftverkehr/vorlagen");
  await requireTemplateWrite(template.letterGroup);
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!subject || !body) redirect("/admin/schriftverkehr/vorlagen?fehler=1");
  db.update(tables.letterTemplates)
    .set({ subject, body, ...(name ? { name } : {}), updatedAt: nowIso() })
    .where(eq(tables.letterTemplates.id, templateId))
    .run();
  revalidatePath("/admin/schriftverkehr/vorlagen");
  redirect("/admin/schriftverkehr/vorlagen?ok=1");
}

export async function createTemplate(formData: FormData) {
  const letterGroupRaw = String(formData.get("letterGroup") ?? "sonstiges");
  await requireTemplateWrite(letterGroupRaw);
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const letterGroup = letterGroupRaw;
  const effect = String(formData.get("effect") ?? "none") === "kuendigung" ? "kuendigung" : "none";
  if (!name || !subject || !body) redirect("/admin/schriftverkehr/vorlagen?fehler=1");
  const type = `eigen-${Date.now()}`;
  db.insert(tables.letterTemplates)
    .values({
      type,
      name,
      letterGroup: ["zahlung", "abmahnung", "kuendigung", "rundschreiben", "sonstiges"].includes(letterGroup)
        ? letterGroup
        : "sonstiges",
      effect,
      locked: false,
      subject,
      body,
      updatedAt: nowIso(),
    })
    .run();
  revalidatePath("/admin/schriftverkehr/vorlagen");
  redirect("/admin/schriftverkehr/vorlagen?ok=neu");
}

export async function deleteTemplate(templateId: number) {
  const template = db.select().from(tables.letterTemplates).where(eq(tables.letterTemplates.id, templateId)).get();
  if (template) await requireTemplateWrite(template.letterGroup);
  else await requireWrite();
  if (template && !template.locked) {
    db.delete(tables.letterTemplates).where(eq(tables.letterTemplates.id, templateId)).run();
  }
  revalidatePath("/admin/schriftverkehr/vorlagen");
  redirect("/admin/schriftverkehr/vorlagen?ok=weg");
}
