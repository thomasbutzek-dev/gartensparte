import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { uploadsDir } from "@/db";
import { pngToIco, resizeLogoToIcon } from "@/lib/image";
import { getSettings } from "@/lib/settings";

export async function logoIconPng(size: number): Promise<Buffer | null> {
  const fileName = getSettings().logoFile;
  if (!fileName) return null;
  const path = join(uploadsDir, "website", fileName);
  if (!existsSync(path)) return null;
  return resizeLogoToIcon(await readFile(path), size);
}

export async function siteIconPng(size: number): Promise<Buffer> {
  const fromLogo = await logoIconPng(size);
  if (fromLogo) return fromLogo;
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#2f7d32",
    },
  })
    .png()
    .toBuffer();
}

export async function siteFaviconIco(): Promise<Buffer> {
  return pngToIco(await siteIconPng(32));
}
