import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser, canManageMoney } from "@/lib/auth";
import { euro, formatDate, formatDateTime, today } from "@/lib/format";
import { card } from "@/lib/ui";

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireUser();
  const params = await searchParams;

  const gardens = db.select().from(tables.gardens).all();
  const freeGardens = gardens.filter((g) => g.status === "frei");
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
  const open = payments.filter((p) => p.paidCents < p.amountCents);
  const overdue = open.filter((p) => p.dueDate && p.dueDate < today());
  const overdueCents = overdue.reduce((sum, p) => sum + (p.amountCents - p.paidCents), 0);

  const tiles = [
    { label: "Gärten gesamt", value: String(gardens.length), href: "/admin/gaerten" },
    { label: "Freie Gärten", value: String(freeGardens.length), href: "/admin/gaerten?status=frei" },
    { label: "Warteliste (offen)", value: String(openApplicants.length), href: "/admin/warteliste" },
    { label: "Neue Anfragen", value: String(unreadInquiries.length), href: "/admin/posteingang" },
    { label: "Offene Aufgaben", value: String(openTasks.length), href: "/admin/aufgaben" },
    ...(canManageMoney(user)
      ? [{ label: "Überfällige Posten", value: `${overdue.length} (${euro(overdueCents)})`, href: "/admin/zahlungen?filter=ueberfaellig" }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Übersicht</h1>
      {params.fehler === "rechte" && (
        <p className="rounded-md bg-amber-100 px-4 py-3 text-amber-800">
          Dafür fehlen Ihrem Konto die Rechte.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className={`${card} block hover:border-green-600`}>
            <p className="text-sm text-stone-500">{tile.label}</p>
            <p className="mt-1 text-2xl font-bold">{tile.value}</p>
          </Link>
        ))}
      </div>
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
      </section>
      {canManageMoney(user) && overdue.length > 0 && (
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">Überfällige Posten</h2>
          <ul className="space-y-2 text-sm">
            {overdue.slice(0, 8).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span>{p.description || p.type} ({p.year})</span>
                <span className="text-red-700">
                  {euro(p.amountCents - p.paidCents)} · fällig {formatDate(p.dueDate)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/zahlungen?filter=ueberfaellig" className="mt-3 inline-block text-sm text-green-700 hover:underline">
            Alle offenen Posten →
          </Link>
        </section>
      )}
    </div>
  );
}
