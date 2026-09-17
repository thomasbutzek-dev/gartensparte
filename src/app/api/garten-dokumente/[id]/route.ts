import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, tables, uploadsDir } from "@/db";
import { canWrite, getPrivilegedSessionUser } from "@/lib/auth";
import { fileResponse } from "@/lib/files";

export async function GET(_request: Request, { params }: RouteContext<"/api/garten-dokumente/[id]">) {
  const user = await getPrivilegedSessionUser();
  if (!user) return new Response("Nur mit Anmeldung", { status: 401 });
  if (!canWrite(user)) return new Response("Keine Berechtigung", { status: 403 });
  const { id } = await params;
  const doc = db.select().from(tables.gardenDocuments).where(eq(tables.gardenDocuments.id, Number(id))).get();
  if (!doc) return new Response("Nicht gefunden", { status: 404 });
  return fileResponse(join(uploadsDir, "gaerten"), doc.fileName, {
    downloadName: doc.originalName,
  });
}
