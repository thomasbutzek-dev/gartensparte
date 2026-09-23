import type { Metadata } from "next";
import { requireModule } from "@/lib/modules";
import { getPublicSettings } from "@/lib/public-cache";
import { loadForecast } from "@/lib/weather";
import { forecastPoint } from "@/lib/weather-place";
import SiteContainer from "@/components/SiteContainer";
import WeatherView from "@/components/WeatherView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wetter" };

export default async function WetterPage() {
  requireModule("wetter");
  const settings = await getPublicSettings();
  const point = forecastPoint(settings);
  const forecast = point ? await loadForecast(point.lat, point.lng) : null;

  return (
    <SiteContainer narrow className="space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">{point?.source === "ort" ? `Wetter in ${point.label}` : "Wetter"}</h1>
        <p className="mt-2 text-stone-600">Die nächsten Tage {point?.source === "ort" ? `in ${point.label}` : "an der Anlage"}.</p>
      </div>
      {point ? (
        <WeatherView forecast={forecast} place={point.source === "ort" ? point.label : undefined} />
      ) : (
        <p className="text-sm text-stone-500">Der Standort ist noch nicht hinterlegt.</p>
      )}
    </SiteContainer>
  );
}
