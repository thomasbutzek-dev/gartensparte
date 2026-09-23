import type { ReactNode } from "react";
import Link from "next/link";
import { subscribeNewsletter } from "@/app/(public)/actions";
import SpamGuard from "@/components/SpamGuard";
import TurnstileField from "@/components/TurnstileField";
import { listVisibleNotices } from "@/lib/notices";
import { richTextPlain } from "@/lib/rich-text";
import { moduleEnabled } from "@/lib/modules";
import type { VereinsSettings } from "@/lib/settings";
import { loadForecast, skyWord } from "@/lib/weather";
import { forecastPoint } from "@/lib/weather-place";
import { newsletterHeading, newsletterNote } from "@/lib/newsletter-copy";
import { loadVerbandNews, verbandFeedSetting, verbandHeading } from "@/lib/verband";
import { btnPrimary, card, input, label } from "@/lib/ui";

export default async function HomeModules({
  settings,
  left,
  right,
}: {
  settings: VereinsSettings;
  left: ReactNode;
  right: ReactNode;
}) {
  const showBoard = moduleEnabled("schaukasten");
  const showWeather = moduleEnabled("wetter");
  const showVerband = moduleEnabled("verband");
  const showNewsletter = moduleEnabled("newsletter");
  const notices = showBoard ? listVisibleNotices(3) : [];
  const point = showWeather ? forecastPoint(settings) : null;
  const forecast = point ? await loadForecast(point.lat, point.lng) : null;
  const verband = showVerband ? verbandFeedSetting() : null;
  const verbandItems = verband?.url ? await loadVerbandNews(verband.url) : [];
  const heading = showVerband ? verbandHeading() : "";
  const outlook = [
    { name: "Heute", day: forecast?.days[0] },
    { name: "Morgen", day: forecast?.days[1] },
    { name: "Übermorgen", day: forecast?.days[2] },
  ].filter((item): item is { name: string; day: NonNullable<typeof item.day> } => Boolean(item.day));
  const box = `${card} flex flex-col`;

  const column = "flex min-w-0 flex-1 flex-col gap-6";

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className={column}>
        {left}
      {showBoard ? (
        <section className={box}>
          <h2 className="mb-3 text-lg font-semibold">Schaukasten</h2>
          {notices.length === 0 ? (
            <p className="text-sm text-stone-500">Im Schaukasten hängt gerade nichts.</p>
          ) : (
            <ul className="space-y-3">
              {notices.map((item) => {
                const teaser = richTextPlain(item.body);
                return (
                <li key={item.id}>
                  <Link href={`/schaukasten#aushang-${item.id}`} className="flex gap-3">
                    {item.imageFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/schaukasten/${item.id}`} alt="" className="size-16 shrink-0 self-start rounded object-cover" />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block font-medium text-green-800 hover:underline">{item.title}</span>
                      {teaser ? <span className="mt-1 line-clamp-2 text-sm text-stone-600">{teaser}</span> : null}
                    </span>
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
          <Link href="/schaukasten" className="mt-auto inline-block pt-4 text-sm text-green-700 hover:underline">
            Alle Aushänge
          </Link>
        </section>
      ) : null}
      {showVerband && verband?.url && verbandItems && verbandItems.length > 0 ? (
        <section className={box}>
          <h2 className="mb-3 text-lg font-semibold">{heading}</h2>
          <ul className="space-y-3">
            {verbandItems.slice(0, 3).map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noreferrer" className="flex gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" referrerPolicy="no-referrer" className="size-16 shrink-0 self-start rounded object-cover" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block font-medium text-green-800 hover:underline">{item.title}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <Link href="/verband" className="mt-auto inline-block pt-4 text-sm text-green-700 hover:underline">
            Alle Meldungen
          </Link>
        </section>
      ) : null}
      </div>
      <div className={column}>
        {right}
      {showWeather && forecast ? (
        <section className={box}>
          <h2 className="mb-3 text-lg font-semibold">{point?.source === "ort" ? `Wetter in ${point.label}` : "Wetter an der Anlage"}</h2>
          {outlook.length === 3 ? (
            <div className="grid grid-cols-3 gap-2 text-sm">
              {outlook.map((item) => (
                <p key={item.name} className="rounded-md bg-stone-50 px-2 py-1.5">
                  <span className="block text-stone-500">{item.name}</span>
                  <span className="block font-medium">{skyWord(item.day.label)}</span>
                  <span className="block font-medium">{Math.round(item.day.max)}°</span>
                </p>
              ))}
            </div>
          ) : null}
          <Link href="/wetter" className="mt-auto inline-block pt-4 text-sm text-green-700 hover:underline">
            Die nächsten Tage
          </Link>
        </section>
      ) : null}
      {showNewsletter ? (
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">{newsletterHeading()}</h2>
          <p className="mb-4 whitespace-pre-line text-sm text-stone-600">{newsletterNote()}</p>
          <form action={subscribeNewsletter} className="space-y-3">
            <SpamGuard />
            <div>
              <label className={label} htmlFor="email-start">E-Mail</label>
              <input id="email-start" name="email" type="email" required autoComplete="email" className={input} />
            </div>
            <TurnstileField action="newsletter" />
            <button className={btnPrimary}>Anmelden</button>
          </form>
          <p className="mt-3 text-sm text-stone-600">
            <Link href="/newsletter" className="text-green-700 hover:underline">Abmelden</Link>
          </p>
        </section>
      ) : null}
      </div>
    </div>
  );
}
