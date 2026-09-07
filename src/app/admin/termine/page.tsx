import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { badge, card, tableClass, td, th } from "@/lib/ui";
import EventForm from "./EventForm";
import { createEvent, deleteEvent, toggleEventStatus } from "./actions";

export default async function AdminTerminePage({ searchParams }: PageProps<"/admin/termine">) {
  await requireUser();
  const params = await searchParams;
  const events = db.select().from(tables.events).orderBy(desc(tables.events.date)).all();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Termine</h1>
      <p className="text-sm text-stone-500">
        Versammlung, Arbeitseinsatz, Fest. Ein Entwurf bleibt intern, veröffentlicht erscheint der Termin auf der Startseite.
      </p>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className={card}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Termin</th>
                <th className={th}>Datum</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className={td}>
                    <Link href={`/admin/termine/${event.id}`} className="font-medium text-green-800 hover:underline">
                      {event.title}
                    </Link>
                    {event.location && <div className="text-xs text-stone-500">{event.location}</div>}
                  </td>
                  <td className={td}>{formatDateTime(event.date)}</td>
                  <td className={td}>
                    <span className={`${badge} ${event.status === "veroeffentlicht" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {event.status === "veroeffentlicht" ? "Veröffentlicht" : "Entwurf"}
                    </span>
                  </td>
                  <td className={`${td} space-x-3 whitespace-nowrap`}>
                    <form action={toggleEventStatus.bind(null, event.id)} className="inline">
                      <button className="text-xs text-green-700 hover:underline">
                        {event.status === "veroeffentlicht" ? "Zurückziehen" : "Veröffentlichen"}
                      </button>
                    </form>
                    <form action={deleteEvent.bind(null, event.id)} className="inline">
                      <button className="text-xs text-red-700 hover:underline">Löschen</button>
                    </form>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td className={td} colSpan={4}>Noch keine Termine.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createEvent} className={`${card} h-fit space-y-4`}>
          <h2 className="text-lg font-semibold">Neuer Termin</h2>
          <EventForm submitLabel="Termin anlegen" />
        </form>
      </div>
    </div>
  );
}
