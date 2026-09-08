import sharp from "sharp";

/** Längste Seite nach dem Verkleinern. Reicht für Website, Gartenfotos und Lageplan. */
export const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 78;

export type ShrunkImage = {
  bytes: Buffer;
  extension: ".jpg" | ".png";
  mimeType: "image/jpeg" | "image/png";
};

/**
 * Macht aus einem hochgeladenen Foto eine kleine Fassung.
 * Das Original bleibt im Speicher und wird nicht mitgeschrieben.
 * PNG mit Transparenz bleibt PNG, alles andere wird JPG.
 */
export async function shrinkUploadedImage(bytes: Buffer): Promise<ShrunkImage | null> {
  try {
    const image = sharp(bytes, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    if (!meta.width || !meta.height) return null;

    const resized = image.resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });

    const keepPng = Boolean(meta.hasAlpha) && Math.max(meta.width, meta.height) <= 800;
    if (keepPng) {
      return {
        bytes: await resized.png({ compressionLevel: 9 }).toBuffer(),
        extension: ".png",
        mimeType: "image/png",
      };
    }

    return {
      bytes: await resized.flatten({ background: "#ffffff" }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
      extension: ".jpg",
      mimeType: "image/jpeg",
    };
  } catch {
    return null;
  }
}
