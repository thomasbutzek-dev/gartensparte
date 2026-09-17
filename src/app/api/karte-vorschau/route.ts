import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName } from "@/lib/files";
import { hasMapPreviewFile, mapPreviewFileName } from "@/lib/map-preview";

/** Nur die gespeicherte Datei. OSM-Kacheln holt refreshMapPreview beim Speichern der Koordinaten. */
export async function GET() {
  if (!hasMapPreviewFile()) return new Response("Keine Kartenvorschau", { status: 404 });
  return fileResponse(join(uploadsDir, "website"), mapPreviewFileName, {
    mimeType: mimeFromName(mapPreviewFileName),
    cache: "public, max-age=3600",
  });
}
