import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, tables, uploadsDir } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { fileResponse, imageCacheControl, mimeFromName } from "@/lib/files";
import { moduleEnabled } from "@/lib/modules";
import { isNoticeVisible } from "@/lib/notices";

export async function GET(request: Request, { params }: RouteContext<"/api/schaukasten/[id]">) {
  const { id } = await params;
  const notice = db.select().from(tables.notices).where(eq(tables.notices.id, Number(id))).get();
  if (!notice?.imageFile) return new Response("Nicht gefunden", { status: 404 });
  const user = await getSessionUser();
  if (!moduleEnabled("schaukasten") && !user) return new Response("Nicht gefunden", { status: 404 });
  if (!isNoticeVisible(notice) && !user) return new Response("Nicht gefunden", { status: 404 });
  return fileResponse(join(uploadsDir, "schaukasten"), notice.imageFile, {
    mimeType: mimeFromName(notice.imageFile),
    cache: imageCacheControl(request),
  });
}
