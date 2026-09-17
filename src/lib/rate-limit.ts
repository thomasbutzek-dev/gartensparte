import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export async function clientFingerprint(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerList.get("x-real-ip") || "local";
  return createHash("sha256").update(ip).digest("hex");
}

export function isRateLimited(key: string, now = Date.now()): boolean {
  const row = db.select().from(tables.rateLimits).where(eq(tables.rateLimits.key, key)).get();
  return Boolean(row && row.blockedUntil > now);
}

/** Zählt einen Fehlversuch. Nach `limit` Treffern in `windowMs` sperrt `blockMs`. */
export function recordRateFailure(
  key: string,
  limit: number,
  windowMs: number,
  blockMs: number,
  now = Date.now(),
): boolean {
  const row = db.select().from(tables.rateLimits).where(eq(tables.rateLimits.key, key)).get();
  const fresh = !row || now - row.windowStart > windowMs;
  const count = fresh ? 1 : row.count + 1;
  const blockedUntil = count >= limit ? now + blockMs : 0;
  db.insert(tables.rateLimits)
    .values({ key, count, windowStart: fresh ? now : row.windowStart, blockedUntil })
    .onConflictDoUpdate({
      target: tables.rateLimits.key,
      set: { count, windowStart: fresh ? now : row!.windowStart, blockedUntil },
    })
    .run();
  return blockedUntil > now;
}

export function clearRateLimit(key: string) {
  db.delete(tables.rateLimits).where(eq(tables.rateLimits.key, key)).run();
}

/** Öffentliche Formulare: `limit` Einsendungen je Fenster, sonst ablehnen. */
export function consumeFormSlot(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const row = db.select().from(tables.rateLimits).where(eq(tables.rateLimits.key, key)).get();
  const fresh = !row || now - row.windowStart > windowMs;
  if (!fresh && row.count >= limit) return false;
  const count = fresh ? 1 : row.count + 1;
  db.insert(tables.rateLimits)
    .values({
      key,
      count,
      windowStart: fresh ? now : row.windowStart,
      blockedUntil: 0,
    })
    .onConflictDoUpdate({
      target: tables.rateLimits.key,
      set: { count, windowStart: fresh ? now : row!.windowStart, blockedUntil: 0 },
    })
    .run();
  return true;
}
