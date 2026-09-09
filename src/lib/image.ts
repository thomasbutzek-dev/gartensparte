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
