import { asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";

export { addressLines, mapsSearchUrl } from "@/lib/settings";

export type GardenCounts = { total: number; free: number; assigned: number };

export function isExistingGarden(status: string): boolean {
  return status !== "entfaellt";
}

export function gardenCountsFrom(gardens: { status: string }[]): GardenCounts {
  const existing = gardens.filter((garden) => isExistingGarden(garden.status));
  const free = existing.filter((garden) => garden.status === "frei").length;
  const assigned = existing.filter((garden) => garden.status === "verpachtet" || garden.status === "kuendigung").length;
  return { total: existing.length, free, assigned };
}

export function gardenCounts(): GardenCounts {
  return gardenCountsFrom(db.select({ status: tables.gardens.status }).from(tables.gardens).all());
}

export function countFreeGardens(): number {
  return gardenCounts().free;
}

/** Zahl nur zeigen, wenn schon verpachtet wurde – sonst wirkt „alle frei“ wie ein Fehler. */
export function showFreeGardenCount(counts: GardenCounts): boolean {
  return counts.assigned > 0 && counts.free > 0;
}

export function freeGardenCtaLabel(counts: GardenCounts): string {
  if (counts.free === 0) return "Garten anfragen";
  if (!showFreeGardenCount(counts)) return "Freie Gärten ansehen";
  if (counts.free === 1) return "1 freien Garten jetzt ansehen";
  return `${counts.free} freie Gärten jetzt ansehen`;
}

export function listPublishedNews(limit?: number) {
  const query = db
    .select()
    .from(tables.news)
    .where(eq(tables.news.status, "veroeffentlicht"))
    .orderBy(desc(tables.news.pinned), desc(tables.news.publishedAt), desc(tables.news.id));
  return limit ? query.limit(limit).all() : query.all();
}

export function listGalleryImages(homeOnly = false) {
  const rows = db.select().from(tables.galleryImages).orderBy(asc(tables.galleryImages.sortOrder), asc(tables.galleryImages.id)).all();
  return homeOnly ? rows.filter((row) => row.showOnHome) : rows;
}

export function listBoardMembers() {
  return db.select().from(tables.boardMembers).orderBy(asc(tables.boardMembers.sortOrder), asc(tables.boardMembers.id)).all();
}

export function getGalleryImage(id: number) {
  return db.select().from(tables.galleryImages).where(eq(tables.galleryImages.id, id)).get();
}

export function getBoardMember(id: number) {
  return db.select().from(tables.boardMembers).where(eq(tables.boardMembers.id, id)).get();
}

/** Schiebt einen Eintrag um eine Position. Null, wenn er schon am Rand steht. */
export function moveInList<T extends { id: number }>(items: T[], id: number, direction: "up" | "down"): T[] | null {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return null;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= items.length) return null;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Dateiname in der Adresse, damit nach einem neuen Foto nicht das alte aus dem Cache kommt. */
export function boardPhotoUrl(member: { id: number; photoFile?: string | null }): string | null {
  if (!member.photoFile) return null;
  return `/api/vorstand-foto/${member.id}?v=${encodeURIComponent(member.photoFile)}`;
}
