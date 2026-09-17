import { unstable_cache } from "next/cache";
import { updateTag } from "next/cache";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db, tables } from "@/db";
import { today } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { gardenCounts, listBoardMembers, listGalleryImages, listPublishedNews } from "@/lib/site";

export const PUBLIC_SITE_TAG = "public-site";

/** Öffentliche Seiten bleiben dynamisch (kein leeres HTML im Docker-Build). Die Daten liegen nach dem ersten Besuch im Speicher. */
const CACHE: { tags: string[]; revalidate: number } = { tags: [PUBLIC_SITE_TAG], revalidate: 120 };

export function revalidatePublicSite() {
  updateTag(PUBLIC_SITE_TAG);
}

export const getPublicSettings = unstable_cache(async () => getSettings(), ["public-settings"], CACHE);

export const getPublicGardenCounts = unstable_cache(async () => gardenCounts(), ["public-garden-counts"], CACHE);

export const getPublicNews = unstable_cache(async (limit?: number) => listPublishedNews(limit), ["public-news"], CACHE);

export const getPublicNewsItem = unstable_cache(
  async (id: number) =>
    db
      .select()
      .from(tables.news)
      .where(and(eq(tables.news.id, id), eq(tables.news.status, "veroeffentlicht")))
      .get(),
  ["public-news-item"],
  CACHE,
);

export const getPublicGallery = unstable_cache(async (homeOnly: boolean) => listGalleryImages(homeOnly), ["public-gallery"], CACHE);

export const getPublicBoard = unstable_cache(async () => listBoardMembers(), ["public-board"], CACHE);

export const getPublicUpcomingEvents = unstable_cache(
  async () =>
    db
      .select()
      .from(tables.events)
      .where(and(eq(tables.events.status, "veroeffentlicht"), gte(tables.events.date, today())))
      .orderBy(asc(tables.events.date))
      .limit(3)
      .all(),
  ["public-upcoming-events"],
  CACHE,
);

export const getPublicEvents = unstable_cache(
  async () =>
    db
      .select()
      .from(tables.events)
      .where(eq(tables.events.status, "veroeffentlicht"))
      .orderBy(asc(tables.events.date))
      .all(),
  ["public-events"],
  CACHE,
);

export const getPublicDocuments = unstable_cache(
  async () =>
    db
      .select()
      .from(tables.documents)
      .where(eq(tables.documents.isPublic, true))
      .orderBy(desc(tables.documents.uploadedAt))
      .all(),
  ["public-documents"],
  CACHE,
);

export const getPublicGardens = unstable_cache(
  async () => db.select().from(tables.gardens).orderBy(asc(tables.gardens.number)).all(),
  ["public-gardens"],
  CACHE,
);
