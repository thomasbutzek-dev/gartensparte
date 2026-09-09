import { eq } from "drizzle-orm";
import { closeSync, existsSync, openSync, readdirSync, statSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";
import type { ImagePresetName } from "@/lib/image";

const websiteKeys = [
  ["logoFile", "logo"],
  ["heroFile", "hero"],
  ["scene1Image", "card"],
  ["scene2Image", "card"],
  ["scene3Image", "card"],
] as const;

/**
 * Verkleinert schon gespeicherte Bilder an Ort und Stelle und wirft die Originale weg.
 * Neue Uploads laufen denselben Weg: es wird nur die kleine Fassung geschrieben.
 */
export function startImageCompact(): Promise<void> {
  const g = globalThis as unknown as { __imageCompactV3?: Promise<void> };
  g.__imageCompactV3 ??= compactStoredImages().catch((error) => {
    console.error("Gespeicherte Bilder konnten nicht verkleinert werden.", error);
    g.__imageCompactV3 = undefined;
  });
  return g.__imageCompactV3;
}

export async function compactStoredImages(): Promise<void> {
  const { uploadsDir } = await import("@/db");
  const lockPath = join(uploadsDir, ".compact.lock");
  if (!acquireLock(lockPath)) {
    return;
  }
  try {
    await compactStoredImagesUnlocked();
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      // Lock-Datei ist schon weg.
    }
  }
}

function acquireLock(lockPath: string): boolean {
  try {
    if (existsSync(lockPath) && Date.now() - statSync(lockPath).mtimeMs > 15_000) {
      unlinkSync(lockPath);
    }
    const fd = openSync(lockPath, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

async function compactStoredImagesUnlocked(): Promise<void> {
  const { db, tables, uploadsDir } = await import("@/db");
  const { getSettings, saveSettings } = await import("@/lib/settings");
  const { getMapBackgroundFile, setMapBackgroundFile } = await import("@/lib/map");
  const { removeImageOptCache, replaceStoredImage } = await import("@/lib/files");

  const settings = getSettings();
  let nextSettings = { ...settings };
  let settingsChanged = false;
  for (const [key, preset] of websiteKeys) {
    const current = settings[key];
    if (!current) continue;
    const replaced = await replaceStoredImage(join(uploadsDir, "website"), current, preset);
    if (replaced?.changed && replaced.fileName !== current) {
      nextSettings = { ...nextSettings, [key]: replaced.fileName };
      settingsChanged = true;
    }
  }
  if (settingsChanged) saveSettings(nextSettings);

  const gallery = db.select().from(tables.galleryImages).all();
  for (const image of gallery) {
    const replaced = await replaceStoredImage(join(uploadsDir, "galerie"), image.fileName, "card");
    if (replaced?.changed && replaced.fileName !== image.fileName) {
      db.update(tables.galleryImages)
        .set({ fileName: replaced.fileName })
        .where(eq(tables.galleryImages.id, image.id))
        .run();
    }
  }

  const board = db.select().from(tables.boardMembers).all();
  for (const member of board) {
    if (!member.photoFile) continue;
    const replaced = await replaceStoredImage(join(uploadsDir, "vorstand"), member.photoFile, "card");
    if (replaced?.changed && replaced.fileName !== member.photoFile) {
      db.update(tables.boardMembers)
        .set({ photoFile: replaced.fileName })
        .where(eq(tables.boardMembers.id, member.id))
        .run();
    }
  }

  const mapFile = getMapBackgroundFile();
  if (mapFile) {
    const replaced = await replaceStoredImage(join(uploadsDir, "karte"), mapFile, "photo");
    if (replaced?.changed && replaced.fileName !== mapFile) {
      setMapBackgroundFile(replaced.fileName);
    }
  }

  await compactDocumentTable(
    db.select().from(tables.documents).all(),
    join(uploadsDir, "dokumente"),
    "photo",
    (id, fileName, mimeType) => {
      db.update(tables.documents).set({ fileName, mimeType }).where(eq(tables.documents.id, id)).run();
    },
  );
  await compactDocumentTable(
    db.select().from(tables.gardenDocuments).all(),
    join(uploadsDir, "gaerten"),
    "photo",
    (id, fileName, mimeType) => {
      db.update(tables.gardenDocuments).set({ fileName, mimeType }).where(eq(tables.gardenDocuments.id, id)).run();
    },
  );

  for (const folder of ["website", "galerie", "vorstand", "karte", "gaerten", "dokumente"] as const) {
    removeImageOptCache(join(uploadsDir, folder));
  }

  const latestSettings = getSettings();
  keepReferencedFiles(join(uploadsDir, "website"), [
    latestSettings.logoFile,
    latestSettings.heroFile,
    latestSettings.scene1Image,
    latestSettings.scene2Image,
    latestSettings.scene3Image,
    "map-preview.png",
  ]);
  keepReferencedFiles(
    join(uploadsDir, "galerie"),
    db.select().from(tables.galleryImages).all().map((row) => row.fileName),
  );
  keepReferencedFiles(
    join(uploadsDir, "vorstand"),
    db.select().from(tables.boardMembers).all().map((row) => row.photoFile ?? ""),
  );
  keepReferencedFiles(join(uploadsDir, "karte"), [getMapBackgroundFile() ?? ""]);
  keepReferencedFiles(
    join(uploadsDir, "dokumente"),
    db.select().from(tables.documents).all().map((row) => row.fileName),
  );
  keepReferencedFiles(
    join(uploadsDir, "gaerten"),
    db.select().from(tables.gardenDocuments).all().map((row) => row.fileName),
  );
}

function keepReferencedFiles(directory: string, fileNames: string[]) {
  if (!existsSync(directory)) return;
  const keep = new Set(fileNames.filter(Boolean));
  for (const name of readdirSync(directory)) {
    if (name.startsWith(".")) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory() || keep.has(name)) continue;
    unlinkSync(path);
  }
}

async function compactDocumentTable(
  rows: { id: number; fileName: string; mimeType: string }[],
  directory: string,
  preset: ImagePresetName,
  save: (id: number, fileName: string, mimeType: string) => void,
) {
  const { isStoredImageName, replaceStoredImage } = await import("@/lib/files");
  for (const row of rows) {
    if (!isStoredImageName(row.fileName) && !row.mimeType.startsWith("image/")) continue;
    const replaced = await replaceStoredImage(directory, row.fileName, preset);
    if (!replaced?.changed) continue;
    if (replaced.fileName !== row.fileName || replaced.mimeType !== row.mimeType) {
      save(row.id, replaced.fileName, replaced.mimeType);
    }
  }
}
