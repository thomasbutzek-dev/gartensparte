import { unlink } from "node:fs/promises";
import { redirect } from "next/navigation";

/** Formulare: Fehler über die URL. */
export function fail(path: string, code: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}fehler=${encodeURIComponent(code)}`);
}

/** Karten-Editor und ähnliche Client-Aufrufe: JSON statt Redirect. */
export function clientError(message: string): { error: string } {
  return { error: message };
}

export function clientOk(): { ok: true } {
  return { ok: true };
}

/** Löschen fehlender Dateien ist in Ordnung; andere Fehler erscheinen im Log. */
export async function deleteStoredFile(path: string) {
  try {
    await unlink(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error(`Datei nicht gelöscht: ${path}`, error);
  }
}
