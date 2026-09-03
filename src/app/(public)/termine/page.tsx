export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { formatDateTime, today } from "@/lib/format";
import { card } from "@/lib/ui";

export const metadata: Metadata = { title: "Termine" };

export default function TerminePage() {
  const events = db
    .select()
    .from(tables.events)
    .where(eq(tables.events.status, "veroeffentlicht"))
    .orderBy(asc(tables.events.date))
    .all();
  const upcoming = events.filter((event) => event.date >= today());
  const past = events.filter((event) => event.date < today()).reverse().slice(0, 10);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Termine</h1>
      <section className="space-y-4">
        {upcoming.length === 0 && <p className="text-stone-500">Zurzeit sind keine Termine angekÃ¼ndigt.</p>}
        {upcoming.map((event) => (
          <article key={event.id} className={card}>
            <h2 className="font-semibold">{event.title}</h2>
            <p className="text-sm text-stone-500">
              {formatDateTime(event.date)}
              {event.endDate ? ` bis ${formatDateTime(event.endDate)}` : ""}
              {event.location ? ` Â· ${event.location}` : ""}
            </p>
            {event.description && <p className="mt-2 whitespace-pre-line text-sm">{event.description}</p>}
          </article>
        ))}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-600">Vergangene Termine</h2>
          <ul className="space-y-1 text-sm text-stone-500">
            {past.map((event) => (
              <li key={event.id}>
                {formatDateTime(event.date)} â€“ {event.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
