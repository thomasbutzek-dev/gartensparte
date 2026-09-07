import "server-only";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import { uploadsDir } from "@/db";

export const mapPreviewFileName = "map-preview.png";

const TILE = 256;
const COLS = 3;
const ROWS = 2;
const ZOOM = 15;

export function mapPreviewPath() {
  return join(uploadsDir, "website", mapPreviewFileName);
}

export function hasMapPreviewFile() {
  return existsSync(mapPreviewPath());
}

function worldPixels(lat: number, lng: number, zoom: number) {
  const size = 2 ** zoom * TILE;
  const x = ((lng + 180) / 360) * size;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size;
  return { x, y };
}

async function fetchTile(z: number, x: number, y: number): Promise<PNG> {
  const max = 2 ** z;
  const wrappedX = ((x % max) + max) % max;
  const url = `https://tile.openstreetmap.org/${z}/${wrappedX}/${y}.png`;
  const response = await fetch(url, {
    headers: { "user-agent": "Gartensparte/1.0 (vereinsverwaltung; lokale Kartenvorschau)" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Kachel ${z}/${wrappedX}/${y} nicht geladen`);
  return PNG.sync.read(Buffer.from(await response.arrayBuffer()));
}

function blit(dest: PNG, src: PNG, dx: number, dy: number) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const from = (y * src.width + x) << 2;
      const to = ((dy + y) * dest.width + (dx + x)) << 2;
      dest.data[to] = src.data[from];
      dest.data[to + 1] = src.data[from + 1];
      dest.data[to + 2] = src.data[from + 2];
      dest.data[to + 3] = src.data[from + 3];
    }
  }
}

function drawMarker(png: PNG, cx: number, cy: number) {
  const radius = 11;
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const distance = Math.hypot(x, y);
      if (distance > radius) continue;
      const px = Math.round(cx + x);
      const py = Math.round(cy + y);
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const i = (py * png.width + px) << 2;
      if (distance > radius - 2.5) {
        png.data[i] = 255;
        png.data[i + 1] = 255;
        png.data[i + 2] = 255;
      } else {
        png.data[i] = 22;
        png.data[i + 1] = 101;
        png.data[i + 2] = 52;
      }
      png.data[i + 3] = 255;
    }
  }
}

/** Baut ein Standbild aus OSM-Kacheln und speichert es lokal. */
export async function refreshMapPreview(lat: number, lng: number): Promise<boolean> {
  try {
    const point = worldPixels(lat, lng, ZOOM);
    const centerX = Math.floor(point.x / TILE);
    const centerY = Math.floor(point.y / TILE);
    const startX = centerX - 1;
    const startY = centerY - Math.floor((ROWS - 1) / 2);
    const mosaic = new PNG({ width: TILE * COLS, height: TILE * ROWS });

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = await fetchTile(ZOOM, startX + col, startY + row);
        blit(mosaic, tile, col * TILE, row * TILE);
      }
    }

    drawMarker(mosaic, point.x - startX * TILE, point.y - startY * TILE);
    await writeFile(mapPreviewPath(), PNG.sync.write(mosaic));
    return true;
  } catch {
    return false;
  }
}
