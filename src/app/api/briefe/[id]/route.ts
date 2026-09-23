import { eq } from "drizzle-orm";
import { db, lettersDir, tables } from "@/db";
import { canSeeMoney, getPrivilegedSessionUser } from "@/lib/auth";
import { fileResponse } from "@/lib/files";
import { isMoneyLetterType } from "@/lib/letter-catalog";
import { moduleEnabled } from "@/lib/modules";

export async function GET(_request: Request, { params }: RouteContext<"/api/briefe/[id]">) {
  const user = await getPrivilegedSessionUser();
  if (!user) return new Response("Nur mit Anmeldung", { status: 401 });
  const { id } = await params;
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, Number(id))).get();
  if (!letter || !letter.fileName || letter.status === "entwurf") {
    return new Response("Nicht gefunden", { status: 404 });
  }
  if (isMoneyLetterType(letter.type) && !moduleEnabled("kasse")) {
    return new Response("Nicht gefunden", { status: 404 });
  }
  if (isMoneyLetterType(letter.type) && !canSeeMoney(user)) {
    return new Response("Keine Berechtigung", { status: 403 });
  }
  return fileResponse(lettersDir, letter.fileName, {
    downloadName: letter.fileName,
    mimeType: "application/pdf",
  });
}
