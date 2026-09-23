import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { today } from "@/lib/format";

export type NoticeRow = typeof tables.notices.$inferSelect;

export function isNoticeVisible(notice: Pick<NoticeRow, "status" | "validFrom" | "validUntil">, day = today()): boolean {
  if (notice.status !== "veroeffentlicht") return false;
  if (notice.validFrom && notice.validFrom > day) return false;
  if (notice.validUntil && notice.validUntil < day) return false;
  return true;
}

function byBoardOrder(a: NoticeRow, b: NoticeRow): number {
  return b.pinned - a.pinned || b.createdAt.localeCompare(a.createdAt);
}

export function listNotices(): NoticeRow[] {
  return db.select().from(tables.notices).orderBy(desc(tables.notices.pinned), desc(tables.notices.createdAt)).all();
}

export function listVisibleNotices(limit?: number, day = today()): NoticeRow[] {
  const visible = listNotices().filter((notice) => isNoticeVisible(notice, day)).sort(byBoardOrder);
  return limit ? visible.slice(0, limit) : visible;
}
