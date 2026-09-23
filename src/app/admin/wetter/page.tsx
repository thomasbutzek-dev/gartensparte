import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requireModule } from "@/lib/modules";
import { getPublicSettings } from "@/lib/public-cache";
import { loadForecast } from "@/lib/weather";
import { forecastPoint, readWeatherPlace } from "@/lib/weather-place";
import SaveButton from "@/components/SaveButton";
import WeatherView from "@/components/WeatherView";
import { btn, card, input, label } from "@/lib/ui";
import { saveWeatherPlace } from "./actions";

export default async function WetterAdminPage({ searchParams }: PageProps<"/admin/wetter">) {
  await requireUser();
  requireModule("wetter");
  const params = await searchParams;
  const settings = await getPublicSettings();
  const saved = readWeatherPlace();
  const point = forecastPoint(settings);
  const forecast = point ? await loadForecast(point.lat, point.lng) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wetter</h1>
        <p className="mt-1 text-sm text-stone-500">
          Ort eintragen, dann gilt der für die Vorhersage. Leer lassen nutzt den Kartenstandort aus den Einstellungen.
        </p>
      </div>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Ort gespeichert.</p>}
      {params.fehler === "ort" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Diesen Ort habe ich nicht gefunden.</p>
      )}
      <form action={saveWeatherPlace} className={`${card} space-y-4`}>
        <div>
          <label className={label} htmlFor="place">Ort</label>
          <input id="place" name="place" defaultValue={saved?.label ?? ""} placeholder="Stendal" className={input} />
        </div>
        {saved ? <p className="text-sm text-stone-600">Gespeichert: {saved.label}</p> : null}
        <div className="flex flex-wrap gap-2">
          <SaveButton>Speichern</SaveButton>
          <SaveButton name="clear" value="1" className={btn}>Kartenstandort nutzen</SaveButton>
        </div>
      </form>
      {point ? (
        <WeatherView forecast={forecast} place={point.source === "ort" ? point.label : undefined} />
      ) : (
        <p className="text-sm text-stone-600">
          Es fehlt ein Ort und der Punkt auf der Karte.{" "}
          <Link href="/admin/einstellungen" className="text-green-700 hover:underline">In den Einstellungen setzen</Link>
        </p>
      )}
    </div>
  );
}
