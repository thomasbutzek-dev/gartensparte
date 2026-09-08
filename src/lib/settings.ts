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
  // Auftritt (Startseite / Kopf / Fuß)
  slogan: string;
  foundingYear: string;
  areaLabel: string; // z.B. "ca. 4 ha" oder "32.000 m²"
  sprechzeiten: string;
  directionsText: string;
  mapAddress: string;
  mapLat: number | null;
  mapLng: number | null;
  showPublicLageplan: boolean;
  logoFile: string;
  heroFile: string;
  scene1Title: string;
  scene1Text: string;
  scene2Title: string;
  scene2Text: string;
  scene3Title: string;
  scene3Text: string;
  scene1Image: string;
  scene2Image: string;
  scene3Image: string;
  gardenDocCategories: string[];
  publicDocCategories: string[];
  gardenAttributes: string[];
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
    "Bitte nutzen Sie das Kontaktformular oder sprechen Sie uns auf dem Gelände an.",
  uebernahmeText:
    "Interessiert an einem Garten? Stellen Sie eine Anfrage über das Formular. Wir melden uns in der Reihenfolge der Eingänge. Bei der Übernahme fallen Pacht, Mitgliedsbeitrag und ggf. eine Abstandszahlung für Laube und Bepflanzung an.",
  impressumText: "Impressum: Angaben werden vom Vorstand ergänzt.",
  datenschutzText: "Datenschutzerklärung: Angaben werden vom Vorstand ergänzt.",
  slogan: "Gärtnern, Gemeinschaft und ein Stück Grün vor der Stadt.",
  foundingYear: "",
  areaLabel: "",
  sprechzeiten: "Sprechzeiten nach Vereinbarung.",
  directionsText: "",
  mapAddress: "",
  mapLat: null,
  mapLng: null,
  showPublicLageplan: false,
  logoFile: "",
  heroFile: "",
  scene1Title: "Die Parzellen",
  scene1Text: "Jede Familie hat ihren eigenen Garten – Beete, Obst und eine Laube.",
  scene2Title: "Das Gelände",
  scene2Text: "Wege, Wasser, Strom und ein Vereinsheim – typisch Kleingartenanlage.",
  scene3Title: "Das Vereinsleben",
  scene3Text: "Arbeitseinsätze, Feste und der Austausch über den Zaun.",
  scene1Image: "",
  scene2Image: "",
  scene3Image: "",
  gardenDocCategories: [],
  publicDocCategories: [],
  gardenAttributes: [],
};

const SETTINGS_KEY = "verein";
const oldBoardDefault =
  "Vorstand\nSprechzeiten: nach Vereinbarung\n\nBitte nutzen Sie das Kontaktformular oder sprechen Sie uns auf dem Gelände an.";

export function getSettings(): VereinsSettings {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, SETTINGS_KEY)).get();
  if (!row) return { ...defaultSettings };
  try {
    const merged = { ...defaultSettings, ...(JSON.parse(row.value) as Partial<VereinsSettings>) };
    if (merged.ansprechpartnerText.trim() === oldBoardDefault) {
      merged.ansprechpartnerText = defaultSettings.ansprechpartnerText;
    }
    merged.showPublicLageplan = merged.showPublicLageplan === true;
    return merged;
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

/** Ein Feld für alle öffentlichen Stellen. */
export function officeHoursLabel(settings: VereinsSettings): string {
  const raw = settings.sprechzeiten.trim();
  if (!raw) return "";
  return /sprechzeiten/i.test(raw) ? raw : `Sprechzeiten: ${raw}`;
}

/** Zusatztext ohne eigene Sprechzeiten-Zeile, damit Footer und Vorstand nicht divergieren. */
export function boardExtraText(settings: VereinsSettings): string {
  const raw = settings.ansprechpartnerText.trim();
  if (!raw || raw === oldBoardDefault) {
    return defaultSettings.ansprechpartnerText;
  }
  return raw
    .split("\n")
    .filter((line) => !/^\s*sprechzeiten\b/i.test(line))
    .join("\n")
    .replace(/^Vorstand\s*\n+/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function hasMapPoint(settings: VereinsSettings): boolean {
  return typeof settings.mapLat === "number" && typeof settings.mapLng === "number" && Number.isFinite(settings.mapLat) && Number.isFinite(settings.mapLng);
}

export function mapsSearchUrl(settings: VereinsSettings): string | null {
  if (hasMapPoint(settings)) {
    return `https://www.openstreetmap.org/?mlat=${settings.mapLat}&mlon=${settings.mapLng}#map=17/${settings.mapLat}/${settings.mapLng}`;
  }
  const query = settings.mapAddress || [settings.vereinStrasse, settings.vereinOrt].filter(Boolean).join(", ");
  if (!query) return null;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

export function osmEmbedUrl(settings: VereinsSettings): string | null {
  if (!hasMapPoint(settings) || settings.mapLat === null || settings.mapLng === null) return null;
  const lat = settings.mapLat;
  const lng = settings.mapLng;
  const pad = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad},${lat - pad},${lng + pad},${lat + pad}&layer=mapnik&marker=${lat},${lng}`;
}

export function addressLines(settings: VereinsSettings): string[] {
  return [settings.vereinName, settings.vereinStrasse, settings.vereinOrt].filter(Boolean);
}

/** Lageplan der Parzellen: öffentlich nur nach Freigabe im Vorstand. */
export function isPublicLageplanVisible(settings: VereinsSettings): boolean {
  return settings.showPublicLageplan === true;
}
