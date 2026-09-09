import sharp from "sharp";

export type ImagePresetName = "photo" | "logo" | "hero" | "card";

export const IMAGE_PRESETS = {
  /** Gartenfotos und sonstige Uploads. */
  photo: { maxEdge: 1600, quality: 78, keepPngIfAlpha: true },
  /** Vereinslogo in Kopf und Titelbild. */
  logo: { maxEdge: 256, quality: 82, keepPngIfAlpha: true },
  /** Großes Titelbild auf der Startseite. */
  hero: { maxEdge: 1600, quality: 68, keepPngIfAlpha: false },
  /** Kacheln, Galerie, Vorstandsfotos. */
  card: { maxEdge: 900, quality: 70, keepPngIfAlpha: false },
} as const;

/** Längste Seite nach dem Verkleinern. Reicht für Website, Gartenfotos und Lageplan. */
export const MAX_IMAGE_EDGE = IMAGE_PRESETS.photo.maxEdge;

export type ShrunkImage = {
  bytes: Buffer;
  extension: ".jpg" | ".png";
  mimeType: "image/jpeg" | "image/png";
};

function keepAsPng(
  meta: { width?: number; height?: number; hasAlpha?: boolean },
  preset: (typeof IMAGE_PRESETS)[ImagePresetName],
  name: ImagePresetName,
  alphaIsUsed: boolean,
): boolean {
  if (!preset.keepPngIfAlpha || !alphaIsUsed || !meta.width || !meta.height) return false;
  if (name === "photo") return Math.max(meta.width, meta.height) <= 800;
  return true;
}

async function imageHasVisibleAlpha(image: sharp.Sharp, hasAlpha: boolean | undefined): Promise<boolean> {
  if (!hasAlpha) return false;
  const stats = await image.clone().stats();
  const alpha = stats.channels[3];
  return Boolean(alpha && alpha.min < 255);
}

/**
 * Macht aus einem Foto eine kleine Fassung für die angegebene Verwendung.
 * Das Original bleibt im Speicher und wird nicht mitgeschrieben.
 * PNG mit Transparenz bleibt PNG, alles andere wird JPG.
 */
export async function shrinkUploadedImage(
  bytes: Buffer,
  presetName: ImagePresetName = "photo",
): Promise<ShrunkImage | null> {
  try {
    const preset = IMAGE_PRESETS[presetName];
    const image = sharp(bytes, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    if (!meta.width || !meta.height) return null;
    const alphaIsUsed = await imageHasVisibleAlpha(image, meta.hasAlpha);

    const resized = image.resize({
      width: preset.maxEdge,
      height: preset.maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (keepAsPng(meta, preset, presetName, alphaIsUsed)) {
      return {
        bytes: await resized.png({ compressionLevel: 9 }).toBuffer(),
        extension: ".png",
        mimeType: "image/png",
      };
    }

    return {
      bytes: await resized.flatten({ background: "#ffffff" }).jpeg({ quality: preset.quality, mozjpeg: true }).toBuffer(),
      extension: ".jpg",
      mimeType: "image/jpeg",
    };
  } catch {
    return null;
  }
}

/** PNG in einer ICO-Hülle, damit /favicon.ico das Logo ausliefert. */
export function pngToIco(png: Buffer): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

/** Quadratisches PNG für Tab und Homescreen. */
export async function resizeLogoToIcon(bytes: Buffer, size: number): Promise<Buffer | null> {
  try {
    return await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}
