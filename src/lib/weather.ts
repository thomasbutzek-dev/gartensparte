export type WeatherDay = {
  date: string;
  code: number;
  label: string;
  min: number;
  max: number;
  rain: number | null;
};

export type Forecast = {
  temp: number;
  code: number;
  label: string;
  wind: number;
  days: WeatherDay[];
};

const cache = new Map<string, { at: number; value: Forecast }>();
const ttlMs = 30 * 60 * 1000;

export function weatherLabel(code: number): string {
  if (code === 0) return "Klar";
  if (code <= 3) return "Bewölkt";
  if (code === 45 || code === 48) return "Nebel";
  if (code >= 51 && code <= 67) return "Regen";
  if (code >= 71 && code <= 77) return "Schnee";
  if (code >= 80 && code <= 82) return "Schauer";
  if (code === 85 || code === 86) return "Schneeschauer";
  if (code >= 95) return "Gewitter";
  return "Wechselhaft";
}

export function skyWord(label: string): string {
  if (label === "Klar") return "Sonne";
  if (label === "Regen" || label === "Schauer" || label === "Gewitter") return "Regnerisch";
  return label;
}

type ForecastJson = {
  current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

function readForecast(data: ForecastJson): Forecast | null {
  const temp = data.current?.temperature_2m;
  const code = data.current?.weather_code;
  const wind = data.current?.wind_speed_10m;
  const time = data.daily?.time;
  if (typeof temp !== "number" || typeof code !== "number" || typeof wind !== "number" || !time?.length) return null;
  const days: WeatherDay[] = [];
  for (let i = 0; i < time.length; i++) {
    const date = time[i];
    const dayCode = data.daily?.weather_code?.[i];
    const min = data.daily?.temperature_2m_min?.[i];
    const max = data.daily?.temperature_2m_max?.[i];
    if (!date || typeof dayCode !== "number" || typeof min !== "number" || typeof max !== "number") continue;
    const rain = data.daily?.precipitation_probability_max?.[i];
    days.push({ date, code: dayCode, label: weatherLabel(dayCode), min, max, rain: typeof rain === "number" ? rain : null });
  }
  if (days.length === 0) return null;
  return { temp, code, label: weatherLabel(code), wind, days };
}

export async function loadForecast(lat: number, lng: number): Promise<Forecast | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    url.searchParams.set("timezone", "Europe/Berlin");
    url.searchParams.set("forecast_days", "7");
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return hit?.value ?? null;
    const forecast = readForecast((await response.json()) as ForecastJson);
    if (!forecast) return hit?.value ?? null;
    cache.set(key, { at: Date.now(), value: forecast });
    return forecast;
  } catch {
    return hit?.value ?? null;
  }
}
