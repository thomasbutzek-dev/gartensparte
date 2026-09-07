import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName } from "@/lib/files";
import { hasMapPreviewFile, mapPreviewFileName, refreshMapPreview } from "@/lib/map-preview";
import { getSettings, hasMapPoint } from "@/lib/settings";

export async function GET() {
  const settings = getSettings();
  if (!hasMapPreviewFile() && hasMapPoint(settings) && settings.mapLat !== null && settings.mapLng !== null) {
    await refreshMapPreview(settings.mapLat, settings.mapLng);
  }
  if (!hasMapPreviewFile()) return new Response("Keine Kartenvorschau", { status: 404 });
  return fileResponse(join(uploadsDir, "website"), mapPreviewFileName, {
    mimeType: mimeFromName(mapPreviewFileName),
    cache: "public, max-age=3600",
  });
}
