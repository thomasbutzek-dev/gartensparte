import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, tables, uploadsDir } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { fileResponse } from "@/lib/files";

export async function GET(_request: Request, { params }: RouteContext<"/api/dokumente/[id]">) {
  const { id } = await params;
  const doc = db.select().from(tables.documents).where(eq(tables.documents.id, Number(id))).get();
  if (!doc) return new Response("Nicht gefunden", { status: 404 });
  if (!doc.isPublic) {
    const user = await getSessionUser();
    if (!user) return new Response("Nur mit Anmeldung", { status: 401 });
  }
  return fileResponse(join(uploadsDir, "dokumente"), doc.fileName, {
    downloadName: doc.originalName,
    mimeType: doc.mimeType,
    cache: doc.isPublic ? "public, max-age=3600" : "private, no-store",
  });
}
