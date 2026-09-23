import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

const TITLE_KEY = "newsletterTitle";
const NOTE_KEY = "newsletterNote";

export const DEFAULT_NEWSLETTER_TITLE = "Newsletter";
export const DEFAULT_NEWSLETTER_NOTE =
  "Die Adresse bleibt im Verein gespeichert, bis sie wieder abgemeldet wird. Es geht keine Bestätigungsmail raus.";

function readSetting(key: string): string {
  return db.select().from(tables.settings).where(eq(tables.settings.key, key)).get()?.value.trim() ?? "";
}

function writeSetting(key: string, value: string): void {
  db.insert(tables.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } })
    .run();
}

export function newsletterHeading(): string {
  return readSetting(TITLE_KEY) || DEFAULT_NEWSLETTER_TITLE;
}

export function newsletterNote(): string {
  return readSetting(NOTE_KEY) || DEFAULT_NEWSLETTER_NOTE;
}

export function newsletterHeadingDraft(): string {
  const value = readSetting(TITLE_KEY);
  return value === DEFAULT_NEWSLETTER_TITLE ? "" : value;
}

export function newsletterNoteDraft(): string {
  const value = readSetting(NOTE_KEY);
  return value === DEFAULT_NEWSLETTER_NOTE ? "" : value;
}

export function setNewsletterCopy(title: string, note: string): void {
  writeSetting(TITLE_KEY, title.trim().slice(0, 80));
  writeSetting(NOTE_KEY, note.trim().slice(0, 2000));
}
