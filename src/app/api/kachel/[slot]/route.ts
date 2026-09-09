import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName, PUBLIC_IMAGE_CACHE } from "@/lib/files";
import { getSettings } from "@/lib/settings";

const keys = ["scene1Image", "scene2Image", "scene3Image"] as const;

export async function GET(_request: Request, { params }: RouteContext<"/api/kachel/[slot]">) {
  const slot = Number((await params).slot);
  const key = keys[slot - 1];
  if (!key) return new Response("Nicht gefunden", { status: 404 });
  const fileName = getSettings()[key];
  if (!fileName) return new Response("Kein Bild hinterlegt", { status: 404 });
  return fileResponse(join(uploadsDir, "website"), fileName, {
    mimeType: mimeFromName(fileName),
    cache: PUBLIC_IMAGE_CACHE,
  });
}
