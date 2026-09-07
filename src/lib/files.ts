import "server-only";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

/** Antwort mit Dateiinhalt; 404 wenn nicht vorhanden oder Pfad das Verzeichnis verlässt. */
export async function fileResponse(
  directory: string,
  fileName: string,
  options: { downloadName?: string; mimeType?: string; cache?: string } = {},
): Promise<Response> {
  const root = resolve(directory);
  const path = resolve(root, fileName);
  if (!path.startsWith(root + sep) || !existsSync(path)) {
    return new Response("Nicht gefunden", { status: 404 });
  }
  const buffer = await readFile(path);
  const headers: Record<string, string> = {
    "content-type": options.mimeType ?? "application/octet-stream",
    "cache-control": options.cache ?? "private, no-store",
    "x-content-type-options": "nosniff",
  };
  if (options.downloadName) {
    headers["content-disposition"] = `inline; filename="${options.downloadName.replace(/["\r\n]/g, "")}"`;
  }
  return new Response(new Uint8Array(buffer), { status: 200, headers });
}

const allowedUploadTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** Bild-Upload (JPG, PNG, WebP) für Logo, Hero, Galerie, Vorstandsfotos. */
export async function saveImageUpload(
  directory: string,
  file: File,
): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Die Datei ist zu groß (max. 15 MB)." };
  const extension = allowedImageTypes[file.type] ?? null;
  if (!extension) return { error: "Erlaubt sind JPG, PNG und WebP." };
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
  return { fileName, mimeType: file.type };
}

/** Upload aus einem FormData-File sicher speichern; gibt den erzeugten Dateinamen zurück. */
export async function saveUpload(directory: string, file: File): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Die Datei ist zu groß (max. 15 MB)." };
  const extension = allowedUploadTypes[file.type] ?? (extname(file.name).toLowerCase() === ".pdf" ? ".pdf" : null);
  if (!extension) return { error: "Erlaubt sind PDF, JPG, PNG, WebP, DOCX und XLSX." };
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
  return { fileName, mimeType: file.type || "application/octet-stream" };
}

export function mimeFromName(fileName: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}
