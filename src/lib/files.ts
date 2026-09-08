import "server-only";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { shrinkUploadedImage } from "@/lib/image";

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
  const mimeType = options.mimeType || mimeFromName(fileName);
  const bytes = new Uint8Array(buffer);
  const safeName = (options.downloadName ?? fileName).replace(/["\r\n]/g, "");
  const headers: Record<string, string> = {
    "content-type": mimeType,
    "content-length": String(bytes.byteLength),
    "cache-control": options.cache ?? "private, no-store",
    "x-content-type-options": "nosniff",
    "content-disposition": `inline; filename="${safeName}"`,
  };
  return new Response(bytes, { status: 200, headers });
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
  if (!allowedImageTypes[file.type]) return { error: "Erlaubt sind JPG, PNG und WebP." };
  return writeImage(directory, Buffer.from(await file.arrayBuffer()));
}

/** Upload aus einem FormData-File sicher speichern; gibt den erzeugten Dateinamen zurück. */
export async function saveUpload(directory: string, file: File): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Die Datei ist zu groß (max. 15 MB)." };
  const extension = allowedUploadTypes[file.type] ?? (extname(file.name).toLowerCase() === ".pdf" ? ".pdf" : null);
  if (!extension) return { error: "Erlaubt sind PDF, JPG, PNG, WebP, DOCX und XLSX." };
  const original = Buffer.from(await file.arrayBuffer());
  if (extension === ".jpg" || extension === ".png" || extension === ".webp") {
    return writeImage(directory, original);
  }
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
  await writeFile(join(directory, fileName), original);
  return { fileName, mimeType: file.type || "application/octet-stream" };
}

async function writeImage(
  directory: string,
  original: Buffer,
): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  const shrunk = await shrinkUploadedImage(original);
  if (!shrunk) return { error: "Das Bild konnte nicht gelesen werden." };
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${shrunk.extension}`;
  await writeFile(join(directory, fileName), shrunk.bytes);
  return { fileName, mimeType: shrunk.mimeType };
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
