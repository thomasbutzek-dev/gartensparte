import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser, canManageMoney } from "@/lib/auth";
import { euro, formatDate, formatDateTime, today } from "@/lib/format";
import { gardenCountsFrom } from "@/lib/site";
import { card } from "@/lib/ui";

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireUser();
  const params = await searchParams;

  const gardens = db.select().from(tables.gardens).all();
  const occupancy = gardenCountsFrom(gardens);
  const openApplicants = db.select().from(tables.applicants).where(eq(tables.applicants.status, "offen")).all();
  const unreadInquiries = db.select().from(tables.inquiries).where(eq(tables.inquiries.isRead, false)).all();
  const openTasks = db.select().from(tables.tasks).all().filter((t) => t.status !== "erledigt");
  const upcomingEvents = db
    .select()
    .from(tables.events)
    .orderBy(asc(tables.events.date))
    .all()
    .filter((e) => e.date >= today())
    .slice(0, 5);

  const payments = db.select().from(tables.payments).all();
  const overdue = payments.filter((p) => p.paidCents < p.amountCents && p.dueDate && p.dueDate < today());
  const overdueCents = overdue.reduce((sum, p) => sum + (p.amountCents - p.paidCents), 0);

  const todayTiles = [
    { label: "Neue Nachrichten", value: String(unreadInquiries.length), href: "/admin/posteingang" },
    { label: "Offene Warteliste", value: String(openApplicants.length), href: "/admin/warteliste" },
    { label: "Offene Aufgaben", value: String(openTasks.length), href: "/admin/aufgaben" },
    ...(canManageMoney(user)
      ? [{ label: "Überfällige Zahlungen", value: `${overdue.length} (${euro(overdueCents)})`, href: "/admin/zahlungen?filter=ueberfaellig" }]
      : []),
  ];

  const shortcuts = [
    { href: "/admin/gaerten", title: "Gartenakte öffnen", text: "Pächter, Dokumente, Zähler." },
    { href: "/admin/website", title: "Website pflegen", text: "Texte, Fotos, Anfahrt, Vorstand." },
    { href: "/admin/termine", title: "Termin eintragen", text: "Erscheint auf der Startseite." },
    { href: "/admin/news", title: "News schreiben", text: "Zuerst als Entwurf, dann veröffentlichen." },
    ...(canManageMoney(user)
      ? [{ href: "/admin/schriftverkehr", title: "Brief schreiben", text: "Jahresrechnung, Kündigung, Rundschreiben." }]
      : []),
    { href: "/admin/dokumente", title: "Dokument ablegen", text: "Satzung, Formulare, intern oder öffentlich." },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Übersicht</h1>
        <p className="mt-1 text-sm text-stone-500">Was heute anliegt, und die kürzesten Wege zur täglichen Arbeit.</p>
      </div>
      {params.fehler === "rechte" && (
        <p className="rounded-md bg-amber-100 px-4 py-3 text-amber-800">Dafür fehlen Ihrem Konto die Rechte.</p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Heute</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {todayTiles.map((tile) => (
            <Link key={tile.label} href={tile.href} className={`${card} block hover:border-green-600`}>
              <p className="text-sm text-stone-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-bold">{tile.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Anlage</h2>
        {occupancy.total === 0 ? (
          <Link href="/admin/gaerten" className={`${card} block hover:border-green-600`}>
            <p className="text-sm text-stone-500">Anlage</p>
            <p className="mt-1 text-lg font-semibold">Noch keine Gärten angelegt</p>
            <p className="mt-2 text-sm text-stone-500">
              Unter Gärten die Anzahl eintragen. Es werden die Nummern 1 bis zu dieser Zahl angelegt.
            </p>
          </Link>
        ) : occupancy.assigned === 0 ? (
          <Link href="/admin/mitglieder" className={`${card} block hover:border-green-600`}>
            <p className="text-sm text-stone-500">{occupancy.total} Gärten angelegt</p>
            <p className="mt-1 text-lg font-semibold">Noch keine Pächter zugeordnet</p>
            <p className="mt-2 text-sm text-stone-500">
              Zuerst ein Mitglied anlegen, dann in der Gartenakte zuweisen. Solange das fehlt, stehen alle Gärten auf frei.
            </p>
          </Link>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/admin/gaerten?status=verpachtet" className={`${card} block hover:border-green-600`}>
              <p className="text-sm text-stone-500">Verpachtet</p>
              <p className="mt-1 text-2xl font-bold">{occupancy.assigned}</p>
            </Link>
            <Link href="/admin/gaerten?status=frei" className={`${card} block hover:border-green-600`}>
              <p className="text-sm text-stone-500">Frei</p>
              <p className="mt-1 text-2xl font-bold">{occupancy.free}</p>
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Häufig gebraucht</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href} className={`${card} block hover:border-green-600`}>
              <p className="font-medium text-green-900">{item.title}</p>
              <p className="mt-1 text-sm text-stone-500">{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-lg font-semibold">Nächste Termine</h2>
        {upcomingEvents.length === 0 && <p className="text-sm text-stone-500">Keine anstehenden Termine.</p>}
        <ul className="space-y-2 text-sm">
          {upcomingEvents.map((event) => (
            <li key={event.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {event.title}
                {event.status === "entwurf" && <span className="ml-2 text-xs text-amber-600">(Entwurf)</span>}
              </span>
              <span className="text-stone-500">{formatDateTime(event.date)}</span>
            </li>
          ))}
        </ul>
        <Link href="/admin/termine" className="mt-3 inline-block text-sm text-green-700 hover:underline">
          Termine bearbeiten
        </Link>
      </section>

      {canManageMoney(user) && overdue.length > 0 && (
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">Überfällige Zahlungen</h2>
          <ul className="space-y-2 text-sm">
            {overdue.slice(0, 8).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {p.description || p.type} ({p.year})
                </span>
                <span className="text-red-700">
                  {euro(p.amountCents - p.paidCents)} · fällig {formatDate(p.dueDate)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/zahlungen?filter=ueberfaellig" className="mt-3 inline-block text-sm text-green-700 hover:underline">
            Alle überfälligen Posten
          </Link>
        </section>
      )}
    </div>
  );
}
