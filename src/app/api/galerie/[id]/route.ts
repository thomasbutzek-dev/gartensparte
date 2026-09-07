import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName } from "@/lib/files";
import { getGalleryImage } from "@/lib/site";

export async function GET(_request: Request, { params }: RouteContext<"/api/galerie/[id]">) {
  const { id } = await params;
  const image = getGalleryImage(Number(id));
  if (!image) return new Response("Nicht gefunden", { status: 404 });
  return fileResponse(join(uploadsDir, "galerie"), image.fileName, {
    mimeType: mimeFromName(image.fileName),
    cache: "public, max-age=3600",
  });
}
