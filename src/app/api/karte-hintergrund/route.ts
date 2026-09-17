import { join } from "node:path";
import { uploadsDir } from "@/db";
import { getPrivilegedSessionUser } from "@/lib/auth";
import { fileResponse, mimeFromName, PUBLIC_IMAGE_CACHE } from "@/lib/files";
import { getMapBackgroundFile } from "@/lib/map";
import { getSettings, isPublicLageplanVisible } from "@/lib/settings";

export async function GET() {
  const fileName = getMapBackgroundFile();
  if (!fileName) return new Response("Kein Lageplan hinterlegt", { status: 404 });
  const published = isPublicLageplanVisible(getSettings());
  const user = published ? null : await getPrivilegedSessionUser();
  if (!published && !user) return new Response("Nicht gefunden", { status: 404 });
  return fileResponse(join(uploadsDir, "karte"), fileName, {
    mimeType: mimeFromName(fileName),
    cache: published ? PUBLIC_IMAGE_CACHE : "private, no-store",
  });
}
