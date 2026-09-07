import "server-only";

export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Gartensparte/1.0 (https://localhost; vereinsverwaltung)",
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as { lat: string; lon: string; display_name?: string }[];
  const first = rows[0];
  if (!first) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: first.display_name ?? q };
}
