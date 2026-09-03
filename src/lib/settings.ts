import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export type VereinsSettings = {
  vereinName: string;
  vereinStrasse: string;
  vereinOrt: string; // PLZ Ort
  vereinEmail: string;
  vereinTelefon: string;
  bankName: string;
  iban: string;
  bic: string;
  vorsitzender: string;
  // Beitragssätze (Cent bzw. Zahlen)
  pachtCentProQm: number;
  mitgliedsbeitragCents: number;
  umlageCents: number;
  umlageBezeichnung: string;
  stromCentProKwh: number;
  stromGrundgebuehrCents: number;
  arbeitsstundenSoll: number;
  arbeitsstundenSatzCents: number;
  zahlungszielTage: number;
  // Öffentliche Texte
  startText: string;
  ansprechpartnerText: string;
  uebernahmeText: string; // Ablauf der Gartenübernahme (Seite „Freie Gärten“)
  impressumText: string;
  datenschutzText: string;
};

export const defaultSettings: VereinsSettings = {
  vereinName: "Gartensparte e.V.",
  vereinStrasse: "",
  vereinOrt: "",
  vereinEmail: "",
  vereinTelefon: "",
  bankName: "",
  iban: "",
  bic: "",
  vorsitzender: "",
  pachtCentProQm: 30,
  mitgliedsbeitragCents: 4000,
  umlageCents: 0,
  umlageBezeichnung: "Umlage",
  stromCentProKwh: 40,
  stromGrundgebuehrCents: 1000,
  arbeitsstundenSoll: 8,
  arbeitsstundenSatzCents: 1500,
  zahlungszielTage: 30,
  startText:
    "Willkommen in unserer Gartensparte. Auf dieser Seite finden Sie Termine, Neuigkeiten, wichtige Dokumente und Informationen zu freien Gärten.",
  ansprechpartnerText:
    "Vorstand\nSprechzeiten: nach Vereinbarung\n\nBitte nutzen Sie das Kontaktformular oder sprechen Sie uns auf dem Gelände an.",
  uebernahmeText:
    "Interessiert an einem Garten? Stellen Sie eine Anfrage über das Formular. Wir melden uns in der Reihenfolge der Eingänge. Bei der Übernahme fallen Pacht, Mitgliedsbeitrag und ggf. eine Abstandszahlung für Laube und Bepflanzung an.",
  impressumText: "Impressum: Angaben werden vom Vorstand ergänzt.",
  datenschutzText: "Datenschutzerklärung: Angaben werden vom Vorstand ergänzt.",
};

const SETTINGS_KEY = "verein";

export function getSettings(): VereinsSettings {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, SETTINGS_KEY)).get();
  if (!row) return { ...defaultSettings };
  try {
    return { ...defaultSettings, ...(JSON.parse(row.value) as Partial<VereinsSettings>) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(value: VereinsSettings) {
  db.insert(tables.settings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: JSON.stringify(value) } })
    .run();
}

/** Nächste lückenlose Rechnungsnummer für ein Jahr, z.B. "2026-001". */
export function nextInvoiceNumber(year: number): string {
  const key = `invoiceCounter:${year}`;
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, key)).get();
  const next = (row ? Number(row.value) : 0) + 1;
  db.insert(tables.settings)
    .values({ key, value: String(next) })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: String(next) } })
    .run();
  return `${year}-${String(next).padStart(3, "0")}`;
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
