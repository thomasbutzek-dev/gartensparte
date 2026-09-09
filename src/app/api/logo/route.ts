import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName, PUBLIC_IMAGE_CACHE } from "@/lib/files";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const fileName = getSettings().logoFile;
  if (!fileName) return new Response("Kein Logo hinterlegt", { status: 404 });
  return fileResponse(join(uploadsDir, "website"), fileName, {
    mimeType: mimeFromName(fileName),
    cache: PUBLIC_IMAGE_CACHE,
  });
}
