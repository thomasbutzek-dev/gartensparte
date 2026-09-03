import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { hashPassword } from "@/lib/password";
import * as schema from "./schema";

const GARDEN_COUNT = 104;

const defaultTemplates: { type: "rechnung" | "mahnung1" | "mahnung2" | "kuendigung" | "rundschreiben"; subject: string; body: string }[] = [
  {
    type: "rechnung",
    subject: "Rechnung {{rechnungsnummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nfür {{jahr}} berechnen wir für Garten {{garten_nummer}} die unten aufgeführten Positionen.\n\n{{positionen}}\n\nGesamtbetrag: {{betrag}}\nBitte überweisen Sie den Betrag bis zum {{frist}} auf unser Vereinskonto.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "mahnung1",
    subject: "Zahlungserinnerung",
    body:
      "Sehr geehrte/r {{name}},\n\nsicher haben Sie es nur übersehen: Für {{beschreibung}} ist noch ein Betrag von {{betrag}} offen (fällig am {{faellig}}).\n\nBitte überweisen Sie den Betrag bis zum {{frist}}.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "mahnung2",
    subject: "2. Mahnung",
    body:
      "Sehr geehrte/r {{name}},\n\ntrotz unserer Zahlungserinnerung ist für {{beschreibung}} weiterhin ein Betrag von {{betrag}} offen (fällig am {{faellig}}).\n\nWir fordern Sie auf, den Betrag bis spätestens {{frist}} zu überweisen. Andernfalls behalten wir uns weitere Schritte gemäß Satzung vor.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "kuendigung",
    subject: "Kündigung des Pachtvertrags für Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nhiermit kündigen wir den Pachtvertrag für Garten {{garten_nummer}} fristgerecht zum {{frist}}.\n\nGrund: {{grund}}\n\nBitte vereinbaren Sie rechtzeitig einen Termin zur Gartenübergabe.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "rundschreiben",
    subject: "Mitteilung des Vorstands",
    body: "Sehr geehrte/r {{name}},\n\n{{text}}\n\nMit freundlichen Grüßen\n{{verein}}",
  },
];

/** Erstbefüllung: Admin-Konto, 104 Gärten, Briefvorlagen. Läuft nur, wenn die Tabellen leer sind. */
export function ensureSeeded(db: BetterSQLite3Database<typeof schema>) {
  const now = new Date().toISOString();

  const hasUsers = db.select({ id: schema.users.id }).from(schema.users).limit(1).all().length > 0;
  if (!hasUsers) {
    const password = process.env.ADMIN_START_PASSWORD || "gartensparte-start";
    db.insert(schema.users)
      .values({
        name: "Administrator",
        username: "admin",
        passwordHash: hashPassword(password),
        role: "admin",
        active: true,
        createdAt: now,
      })
      .run();
  }

  const hasGardens = db.select({ id: schema.gardens.id }).from(schema.gardens).limit(1).all().length > 0;
  if (!hasGardens) {
    for (let number = 1; number <= GARDEN_COUNT; number++) {
      db.insert(schema.gardens).values({ number, status: "frei" }).run();
    }
  }

  const hasTemplates = db.select({ id: schema.letterTemplates.id }).from(schema.letterTemplates).limit(1).all().length > 0;
  if (!hasTemplates) {
    for (const template of defaultTemplates) {
      db.insert(schema.letterTemplates).values({ ...template, updatedAt: now }).run();
    }
  }
}
