import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

const SETTINGS_KEY = "modules";

/** Bekannte Module. Ein neues Modul kommt hier dazu, der Schalter zeigt es dann. */
const catalog = [
  {
    id: "kasse",
    name: "Kasse",
    description: "Zahlungen, Rechnungen, Mahnungen und offene Posten.",
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Öffentliche Anmeldung. Adressen bleiben in der Vereinsdatenbank.",
  },
  {
    id: "schaukasten",
    name: "Schaukasten",
    description: "Aushänge und Angebote auf der Website.",
  },
  {
    id: "wetter",
    name: "Wetter",
    description: "Vorhersage für einen Ort oder den Kartenstandort.",
  },
  {
    id: "verband",
    name: "Verbands-News",
    description: "Meldungen der hinterlegten Verbandsseite.",
  },
] as const;

export type ModuleId = (typeof catalog)[number]["id"];

const defaults: Record<ModuleId, boolean> = {
  kasse: true,
  newsletter: true,
  schaukasten: true,
  wetter: true,
  verband: true,
};

export type ModuleSwitch = {
  id: ModuleId;
  name: string;
  description: string;
  enabled: boolean;
};

function readFlags(): Record<ModuleId, boolean> {
  const flags = { ...defaults };
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, SETTINGS_KEY)).get();
  if (!row) return flags;
  try {
    const parsed = JSON.parse(row.value) as Partial<Record<ModuleId, unknown>>;
    for (const item of catalog) {
      const value = parsed[item.id];
      if (typeof value === "boolean") flags[item.id] = value;
    }
  } catch {
    return { ...defaults };
  }
  return flags;
}

export function moduleEnabled(id: ModuleId): boolean {
  return readFlags()[id];
}

export function requireModule(id: ModuleId): void {
  if (!moduleEnabled(id)) notFound();
}

export function listModules(): ModuleSwitch[] {
  const flags = readFlags();
  return catalog.map((item) => ({ ...item, enabled: flags[item.id] }));
}

export function setModuleEnabled(id: ModuleId, enabled: boolean): void {
  const flags = readFlags();
  flags[id] = enabled;
  const value = JSON.stringify(flags);
  db.insert(tables.settings)
    .values({ key: SETTINGS_KEY, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } })
    .run();
}
