import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName } from "@/lib/files";
import { getMapBackgroundFile } from "@/lib/map";

export async function GET() {
  const fileName = getMapBackgroundFile();
  if (!fileName) return new Response("Kein Lageplan hinterlegt", { status: 404 });
  return fileResponse(join(uploadsDir, "karte"), fileName, {
    mimeType: mimeFromName(fileName),
    cache: "public, max-age=300",
  });
}
