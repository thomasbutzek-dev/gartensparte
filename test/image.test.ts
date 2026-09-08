import { mkdtempSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_IMAGE_EDGE, shrinkUploadedImage } from "@/lib/image";
import { saveImageUpload, saveUpload } from "@/lib/files";

function noisyPng(width: number, height: number, alpha = false): Buffer {
  const png = new PNG({ width, height, colorType: alpha ? 6 : 2 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = (i * 37) % 256;
    png.data[i + 1] = (i * 17) % 256;
    png.data[i + 2] = (i * 53) % 256;
    png.data[i + 3] = alpha ? 180 : 255;
  }
  return PNG.sync.write(png);
}

describe("Bilder verkleinern", () => {
  it("macht aus einem großen Foto eine kleine JPG-Fassung", async () => {
    const original = noisyPng(2400, 1800);
    const shrunk = await shrinkUploadedImage(original);
    expect(shrunk).not.toBeNull();
    expect(shrunk!.extension).toBe(".jpg");
    expect(shrunk!.bytes.length).toBeLessThan(original.length);
    const meta = await sharp(shrunk!.bytes).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(MAX_IMAGE_EDGE);
  });

  it("behält Transparenz als PNG", async () => {
    const original = noisyPng(80, 80, true);
    const shrunk = await shrinkUploadedImage(original);
    expect(shrunk?.extension).toBe(".png");
    expect((await sharp(shrunk!.bytes).metadata()).hasAlpha).toBe(true);
  });

  it("speichert nur die kleine Fassung, nicht das Original", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gartensparte-upload-"));
    const original = noisyPng(2400, 1600);
    const file = new File([original], "garten.png", { type: "image/png" });
    const saved = await saveImageUpload(dir, file);
    expect(saved).toMatchObject({ mimeType: "image/jpeg" });
    if ("error" in saved) throw new Error(saved.error);
    const files = await readdir(dir);
    expect(files).toEqual([saved.fileName]);
    expect(saved.fileName.endsWith(".jpg")).toBe(true);
    const written = await readFile(join(dir, saved.fileName));
    expect(written.length).toBeLessThan(original.length);
  });

  it("lässt PDF unverändert", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gartensparte-pdf-"));
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n");
    const saved = await saveUpload(dir, new File([pdf], "brief.pdf", { type: "application/pdf" }));
    expect(saved).toMatchObject({ mimeType: "application/pdf" });
    if ("error" in saved) throw new Error(saved.error);
    expect(saved.fileName.endsWith(".pdf")).toBe(true);
    expect(await readFile(join(dir, saved.fileName))).toEqual(pdf);
  });
});
