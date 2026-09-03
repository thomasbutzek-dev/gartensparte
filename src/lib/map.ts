import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export function parsePolygon(value: string | null): [number, number][] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    return parsed as [number, number][];
  } catch {
    return null;
  }
}

const MAP_BACKGROUND_KEY = "mapBackground";

export function getMapBackgroundFile(): string | null {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, MAP_BACKGROUND_KEY)).get();
  return row?.value || null;
}

export function setMapBackgroundFile(fileName: string) {
  db.insert(tables.settings)
    .values({ key: MAP_BACKGROUND_KEY, value: fileName })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: fileName } })
    .run();
}
