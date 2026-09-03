export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, today } from "@/lib/format";
import { card } from "@/lib/ui";

export default function StartPage() {
  const settings = getSettings();
  const nextEvents = db
    .select()
    .from(tables.events)
    .where(eq(tables.events.status, "veroeffentlicht"))
    .orderBy(asc(tables.events.date))
    .all()
    .filter((event) => event.date >= today())
    .slice(0, 3);
  const latestNews = db
    .select()
    .from(tables.news)
    .where(eq(tables.news.status, "veroeffentlicht"))
    .orderBy(desc(tables.news.publishedAt))
    .limit(3)
    .all();
  const freeGardens = db.select().from(tables.gardens).where(eq(tables.gardens.status, "frei")).all();

  return (
    <div className="space-y-10">
      <section className="rounded-xl bg-green-700 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold">{settings.vereinName}</h1>
        <p className="mt-3 max-w-2xl whitespace-pre-line">{settings.startText}</p>
        {freeGardens.length > 0 && (
          <Link
            href="/freie-gaerten"
            className="mt-5 inline-block rounded-md bg-white px-4 py-2 font-medium text-green-800 hover:bg-green-50"
          >
            {freeGardens.length === 1 ? "1 freier Garten" : `${freeGardens.length} freie GÃ¤rten`} â€“ jetzt ansehen
          </Link>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">NÃ¤chste Termine</h2>
          {nextEvents.length === 0 && <p className="text-sm text-stone-500">Zurzeit sind keine Termine angekÃ¼ndigt.</p>}
          <ul className="space-y-3">
            {nextEvents.map((event) => (
              <li key={event.id}>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-stone-500">
                  {formatDateTime(event.date)}
                  {event.location ? ` Â· ${event.location}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/termine" className="mt-4 inline-block text-sm text-green-700 hover:underline">
            Alle Termine â†’
          </Link>
        </section>

        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">Neuigkeiten</h2>
          {latestNews.length === 0 && <p className="text-sm text-stone-500">Noch keine Neuigkeiten.</p>}
          <ul className="space-y-3">
            {latestNews.map((item) => (
              <li key={item.id}>
                <Link href={`/news/${item.id}`} className="font-medium text-green-800 hover:underline">
                  {item.title}
                </Link>
                <p className="text-sm text-stone-500">{formatDate(item.publishedAt)}</p>
              </li>
            ))}
          </ul>
          <Link href="/news" className="mt-4 inline-block text-sm text-green-700 hover:underline">
            Alle News â†’
          </Link>
        </section>
      </div>
    </div>
  );
}
