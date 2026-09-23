import { formatDate } from "@/lib/format";
import { skyWord, type Forecast } from "@/lib/weather";
import { card } from "@/lib/ui";

function dayLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return formatDate(iso);
  return `${date.toLocaleDateString("de-DE", { weekday: "short" })}, ${formatDate(iso)}`;
}

export default function WeatherView({ forecast, place }: { forecast: Forecast | null; place?: string }) {
  if (!forecast) {
    return <p className="text-sm text-stone-500">Die Vorhersage ist gerade nicht erreichbar.</p>;
  }
  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="text-4xl font-bold">{Math.round(forecast.temp)} °C</p>
        <p className="mt-1 text-stone-600">
          {skyWord(forecast.label)} · Wind {Math.round(forecast.wind)} km/h
        </p>
      </section>
      <ul className={card}>
        {forecast.days.map((day) => (
          <li key={day.date} className="flex items-baseline justify-between gap-4 border-b border-stone-100 py-2 last:border-0">
            <span>
              <span className="font-medium">{dayLabel(day.date)}</span>
              <span className="ml-2 text-stone-500">{skyWord(day.label)}</span>
            </span>
            <span className="shrink-0 text-sm">
              {Math.round(day.min)}° / {Math.round(day.max)}°
              {day.rain ? <span className="ml-2 text-stone-500">{day.rain} % Regen</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-stone-500">Quelle: Open-Meteo{place ? `. ${place}` : ""}.</p>
    </div>
  );
}
