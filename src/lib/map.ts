import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export { distanceToSegment, insertIndexOnEdge, parsePolygon } from "./map-geometry";

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
