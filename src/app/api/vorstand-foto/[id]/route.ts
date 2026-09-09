import { join } from "node:path";
import { uploadsDir } from "@/db";
import { fileResponse, mimeFromName, PUBLIC_IMAGE_CACHE } from "@/lib/files";
import { getBoardMember } from "@/lib/site";

export async function GET(_request: Request, { params }: RouteContext<"/api/vorstand-foto/[id]">) {
  const { id } = await params;
  const member = getBoardMember(Number(id));
  if (!member?.photoFile) return new Response("Nicht gefunden", { status: 404 });
  return fileResponse(join(uploadsDir, "vorstand"), member.photoFile, {
    mimeType: mimeFromName(member.photoFile),
    cache: PUBLIC_IMAGE_CACHE,
  });
}
