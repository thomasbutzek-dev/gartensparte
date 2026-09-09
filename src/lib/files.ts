import "server-only";
import { randomBytes } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { shrinkUploadedImage, type ImagePresetName } from "@/lib/image";

/** Öffentliche Bilder dürfen eine Stunde im Browser bleiben. */
export const PUBLIC_IMAGE_CACHE = "public, max-age=3600";

const storedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function isStoredImageName(fileName: string): boolean {
  return storedImageExtensions.has(extname(fileName).toLowerCase());
}

function resolveInside(directory: string, fileName: string): string | null {
  const root = resolve(directory);
  const path = resolve(root, fileName);
  if (!path.startsWith(root + sep) || !existsSync(path)) return null;
  return path;
}

/** Antwort mit Dateiinhalt; 404 wenn nicht vorhanden oder Pfad das Verzeichnis verlässt. */
export async function fileResponse(
  directory: string,
  fileName: string,
  options: { downloadName?: string; mimeType?: string; cache?: string } = {},
): Promise<Response> {
  const path = resolveInside(directory, fileName);
  if (!path) {
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

const imageTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Dateityp aus dem Browser oder, wenn der fehlt, aus der Endung. */
export function imageTypeFromFile(file: File): string | null {
  if (allowedImageTypes[file.type]) return file.type;
  return imageTypeByExtension[extname(file.name).toLowerCase()] ?? null;
}

/** Bild-Upload (JPG, PNG, WebP) für Logo, Hero, Galerie, Vorstandsfotos. */
export async function saveImageUpload(
  directory: string,
  file: File,
  preset: ImagePresetName = "photo",
): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Die Datei ist zu groß (max. 15 MB)." };
  if (!imageTypeFromFile(file)) return { error: "Erlaubt sind JPG, PNG und WebP." };
  return writeImage(directory, Buffer.from(await file.arrayBuffer()), preset);
}

/** Upload aus einem FormData-File sicher speichern; gibt den erzeugten Dateinamen zurück. */
export async function saveUpload(directory: string, file: File): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Die Datei ist zu groß (max. 15 MB)." };
  const namedExt = extname(file.name).toLowerCase();
  const fromName =
    namedExt === ".pdf"
      ? ".pdf"
      : namedExt === ".jpeg"
        ? ".jpg"
        : namedExt === ".jpg" || namedExt === ".png" || namedExt === ".webp"
          ? namedExt
          : namedExt === ".docx" || namedExt === ".xlsx"
            ? namedExt
            : null;
  const extension = allowedUploadTypes[file.type] ?? fromName;
  if (!extension) return { error: "Erlaubt sind PDF, JPG, PNG, WebP, DOCX und XLSX." };
  const original = Buffer.from(await file.arrayBuffer());
  if (extension === ".jpg" || extension === ".png" || extension === ".webp") {
    return writeImage(directory, original, "photo");
  }
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
  await writeFile(join(directory, fileName), original);
  return { fileName, mimeType: file.type || "application/octet-stream" };
}

async function writeImage(
  directory: string,
  original: Buffer,
  preset: ImagePresetName,
): Promise<{ fileName: string; mimeType: string } | { error: string }> {
  const shrunk = await shrinkUploadedImage(original, preset);
  if (!shrunk) return { error: "Das Bild konnte nicht gelesen werden." };
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${shrunk.extension}`;
  await writeFile(join(directory, fileName), shrunk.bytes);
  return { fileName, mimeType: shrunk.mimeType };
}

/**
 * Ersetzt eine schon gespeicherte Datei durch die kleine Fassung und löscht das Original.
 * Unverändert, wenn die Datei fehlt, kein Bild ist oder die neue Fassung nicht kleiner wird.
 */
export async function replaceStoredImage(
  directory: string,
  fileName: string,
  preset: ImagePresetName,
): Promise<{ fileName: string; mimeType: string; changed: boolean } | null> {
  if (!isStoredImageName(fileName)) return null;
  const path = resolveInside(directory, fileName);
  if (!path) return null;
  const original = await readFile(path);
  const shrunk = await shrinkUploadedImage(original, preset);
  if (!shrunk) return null;

  const sameType = shrunk.extension === extname(fileName).toLowerCase().replace(".jpeg", ".jpg");
  const smallEnough = shrunk.bytes.length < original.length * 0.9;
  if (sameType && !smallEnough) {
    return { fileName, mimeType: mimeFromName(fileName), changed: false };
  }
  if (!smallEnough && shrunk.bytes.length >= original.length) {
    return { fileName, mimeType: mimeFromName(fileName), changed: false };
  }

  const stem = fileName.replace(/\.[^.]+$/, "");
  let nextName = `${stem}${shrunk.extension}`;
  const dest = join(directory, nextName);
  if (nextName !== fileName && existsSync(dest)) {
    const existing = await readFile(dest);
    if (existing.length <= Math.max(shrunk.bytes.length, original.length * 0.9)) {
      await unlink(path);
      return { fileName: nextName, mimeType: mimeFromName(nextName), changed: true };
    }
    nextName = `${stem}-${randomBytes(4).toString("hex")}${shrunk.extension}`;
  }

  const destPath = join(directory, nextName);
  const tmp = join(directory, `.${nextName}.${randomBytes(4).toString("hex")}.tmp`);
  await writeFile(tmp, shrunk.bytes);
  if (existsSync(destPath)) await unlink(destPath);
  await rename(tmp, destPath);
  if (path !== destPath && existsSync(path)) await unlink(path);

  return { fileName: nextName, mimeType: shrunk.mimeType, changed: true };
}

/** Löscht den früheren Zwischenspeicher neben den Originalen. */
export function removeImageOptCache(directory: string) {
  rmSync(join(directory, ".opt"), { recursive: true, force: true });
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
