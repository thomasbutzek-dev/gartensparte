import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { hasMapPoint, type VereinsSettings } from "@/lib/settings";

const KEY = "weatherPlace";

export type WeatherPlace = { label: string; lat: number; lng: number };

export type ForecastPoint = WeatherPlace & { source: "ort" | "karte" };

type GeoHit = {
  name?: string;
  admin1?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
};

export function readWeatherPlace(): WeatherPlace | null {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, KEY)).get();
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<WeatherPlace>;
    if (!parsed.label || typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    return { label: parsed.label, lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

export function writeWeatherPlace(place: WeatherPlace | null): void {
  if (!place) {
    db.delete(tables.settings).where(eq(tables.settings.key, KEY)).run();
    return;
  }
  const value = JSON.stringify(place);
  db.insert(tables.settings)
    .values({ key: KEY, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } })
    .run();
}

export function forecastPoint(settings: VereinsSettings): ForecastPoint | null {
  const place = readWeatherPlace();
  if (place) return { ...place, source: "ort" };
  if (!hasMapPoint(settings) || settings.mapLat === null || settings.mapLng === null) return null;
  return { label: "Kartenstandort", lat: settings.mapLat, lng: settings.mapLng, source: "karte" };
}

export async function geocodePlace(name: string): Promise<WeatherPlace | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "de");
  url.searchParams.set("format", "json");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) return null;
  const data = (await response.json()) as { results?: GeoHit[] };
  const results = data.results ?? [];
  const hit = results.find((item) => item.country_code === "DE") ?? results[0];
  if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number" || !hit.name) return null;
  const label = [hit.name, hit.admin1].filter(Boolean).join(", ");
  return { label, lat: hit.latitude, lng: hit.longitude };
}
