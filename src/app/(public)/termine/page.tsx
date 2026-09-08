export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { formatDateTime, today } from "@/lib/format";
import { card } from "@/lib/ui";
import RichText from "@/components/RichText";
import SiteContainer from "@/components/SiteContainer";

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
    <SiteContainer className="space-y-8 py-10">
      <h1 className="text-2xl font-bold">Termine</h1>
      <section className="space-y-4">
        {upcoming.length === 0 && <p className="text-stone-500">Zurzeit sind keine Termine angekündigt.</p>}
        {upcoming.map((event) => (
          <article key={event.id} className={card}>
            <h2 className="font-semibold">{event.title}</h2>
            <p className="text-sm text-stone-500">
              {formatDateTime(event.date)}
              {event.endDate ? ` bis ${formatDateTime(event.endDate)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.description ? <RichText html={event.description} className="mt-2 text-sm" /> : null}
          </article>
        ))}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-600">Vergangene Termine</h2>
          <ul className="space-y-1 text-sm text-stone-500">
            {past.map((event) => (
              <li key={event.id}>
                {formatDateTime(event.date)} – {event.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </SiteContainer>
  );
}
