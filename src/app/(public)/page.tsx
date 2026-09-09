export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { boardExtraText, getSettings, hasMapPoint, officeHoursLabel, osmEmbedUrl } from "@/lib/settings";
import { addressLines, boardPhotoUrl, freeGardenCtaLabel, gardenCounts, listBoardMembers, listGalleryImages, listPublishedNews, mapsSearchUrl } from "@/lib/site";
import { formatDate, formatDateTime, today } from "@/lib/format";
import { badge, card, photoMuted, photoScrim, photoText, photoWash } from "@/lib/ui";
import SiteContainer from "@/components/SiteContainer";
import GardenHeroArt from "@/components/GardenHeroArt";
import GardenScenes from "@/components/GardenScenes";
import PublicMap from "@/components/PublicMap";
import ImpressionStrip from "@/components/ImpressionStrip";
import RichText from "@/components/RichText";

export default function StartPage() {
  const settings = getSettings();
  const occupancy = gardenCounts();
  const nextEvents = db
    .select()
    .from(tables.events)
    .where(eq(tables.events.status, "veroeffentlicht"))
    .orderBy(asc(tables.events.date))
    .all()
    .filter((event) => event.date >= today())
    .slice(0, 3);
  const latestNews = listPublishedNews(3);
  const gallery = listGalleryImages(true).slice(0, 6);
  const board = listBoardMembers().slice(0, 4);
  const mapsUrl = mapsSearchUrl(settings);
  const address = addressLines(settings);

  return (
    <div>
      <section className="relative overflow-hidden bg-sparte text-white">
        {settings.heroFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/api/hero"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className={`relative ${settings.heroFile ? photoWash : "bg-gradient-to-br from-lime-600 via-sparte to-sparte-deep"}`}>
          {!settings.heroFile ? <GardenHeroArt /> : null}
          <SiteContainer className="relative flex min-h-[28rem] flex-col justify-end py-14 md:min-h-[32rem]">
            <div className={`max-w-2xl ${settings.heroFile ? `-mx-4 px-4 pb-12 pt-20 ${photoScrim}` : ""}`}>
              {settings.logoFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/api/logo"
                  alt=""
                  width={64}
                  height={64}
                  decoding="async"
                  className="mb-5 h-16 w-16 rounded-full bg-white object-contain p-1 shadow"
                />
              ) : null}
              <h1 className={`text-4xl font-bold tracking-tight md:text-5xl ${photoText}`}>{settings.vereinName}</h1>
              {settings.slogan ? <p className={`mt-3 text-lg ${photoMuted}`}>{settings.slogan}</p> : null}
              <RichText html={settings.startText} tone="photo" className={`mt-4 max-w-xl ${photoMuted}`} />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/freie-gaerten"
                  className="inline-flex items-center rounded-md bg-white px-4 py-2.5 font-medium text-sparte-deep hover:bg-lime-50"
                >
                  {freeGardenCtaLabel(occupancy)}
                </Link>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center rounded-md border border-white/60 px-4 py-2.5 font-medium text-white hover:bg-white/10"
                >
                  Kontakt
                </Link>
              </div>
            </div>
          </SiteContainer>
        </div>
      </section>

      <GardenScenes settings={settings} />

      <SiteContainer className="space-y-14 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">Nächste Termine</h2>
            {nextEvents.length === 0 && <p className="text-sm text-stone-500">Zurzeit sind keine Termine angekündigt.</p>}
            <ul className="space-y-3">
              {nextEvents.map((event) => (
                <li key={event.id}>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-stone-500">
                    {formatDateTime(event.date)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <Link href="/termine" className="mt-4 inline-block text-sm text-green-700 hover:underline">
              Alle Termine
            </Link>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">News</h2>
            {latestNews.length === 0 && <p className="text-sm text-stone-500">Noch keine Neuigkeiten.</p>}
            <ul className="space-y-3">
              {latestNews.map((item) => (
                <li key={item.id}>
                  <Link href={`/news/${item.id}`} className="font-medium text-green-800 hover:underline">
                    {item.title}
                  </Link>
                  {item.pinned ? <span className={`${badge} ml-2 bg-amber-100 text-amber-900`}>Oben gehalten</span> : null}
                  <p className="text-sm text-stone-500">{formatDate(item.publishedAt)}</p>
                </li>
              ))}
            </ul>
            <Link href="/news" className="mt-4 inline-block text-sm text-green-700 hover:underline">
              Alle News
            </Link>
          </section>
        </div>

        <ImpressionStrip images={gallery} />

        <div className="grid gap-6 md:grid-cols-2">
          <section className={card}>
            <h2 className="mb-4 text-lg font-semibold">Vorstand</h2>
            {board.length === 0 ? (
              <RichText html={boardExtraText(settings)} className="text-sm text-stone-600" />
            ) : (
              <ul className="space-y-3">
                {board.map((member) => {
                  const photo = boardPhotoUrl(member);
                  return (
                  <li key={member.id} className="flex items-center gap-3">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800">
                        {member.name.slice(0, 1)}
                      </span>
                    )}
                    <span>
                      <span className="block font-medium">{member.name}</span>
                      {member.role ? <span className="text-sm text-stone-500">{member.role}</span> : null}
                    </span>
                  </li>
                  );
                })}
              </ul>
            )}
            {officeHoursLabel(settings) ? (
              <p className="mt-3 text-sm text-stone-600">{officeHoursLabel(settings)}</p>
            ) : null}
            <Link href="/vorstand" className="mt-4 inline-block text-sm text-green-700 hover:underline">
              Alle Ansprechpartner
            </Link>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">Anfahrt</h2>
            {address.slice(1).length > 0 ? (
              <p>
                {address.slice(1).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-sm text-stone-500">Die Anschrift wird noch ergänzt.</p>
            )}
            {settings.directionsText ? <RichText html={settings.directionsText} className="mt-3 text-sm text-stone-600" /> : null}
            {hasMapPoint(settings) && mapsUrl && osmEmbedUrl(settings) ? (
              <PublicMap embedUrl={osmEmbedUrl(settings)!} pageUrl={mapsUrl} />
            ) : mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-green-700 hover:underline">
                Auf OpenStreetMap öffnen
              </a>
            ) : null}
          </section>
        </div>
      </SiteContainer>
    </div>
  );
}
