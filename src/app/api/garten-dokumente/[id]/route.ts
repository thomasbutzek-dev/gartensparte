import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, tables, uploadsDir } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { fileResponse } from "@/lib/files";

export async function GET(_request: Request, { params }: RouteContext<"/api/garten-dokumente/[id]">) {
  const user = await getSessionUser();
  if (!user) return new Response("Nur mit Anmeldung", { status: 401 });
  const { id } = await params;
  const doc = db.select().from(tables.gardenDocuments).where(eq(tables.gardenDocuments.id, Number(id))).get();
  if (!doc) return new Response("Nicht gefunden", { status: 404 });
  return fileResponse(join(uploadsDir, "gaerten"), doc.fileName, {
    downloadName: doc.originalName,
    mimeType: doc.mimeType,
  });
}
