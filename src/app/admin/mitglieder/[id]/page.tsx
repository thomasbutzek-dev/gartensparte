import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser, canManageMoney, canAdminister } from "@/lib/auth";
import { euro, formatDate } from "@/lib/format";
import { getWorkExemption } from "@/lib/work-hours";
import { btn, btnDanger, btnPrimary, card, tableClass, td, th } from "@/lib/ui";
import MemberFields from "../MemberFields";
import { deleteMember, setMemberStatus, updateMember } from "../actions";

export default async function MitgliedPage({ params, searchParams }: PageProps<"/admin/mitglieder/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const member = db.select().from(tables.members).where(eq(tables.members.id, Number(id))).get();
  if (!member) notFound();

  const tenancies = db
    .select({
      id: tables.tenancies.id,
      startDate: tables.tenancies.startDate,
      endDate: tables.tenancies.endDate,
      gardenId: tables.tenancies.gardenId,
      gardenNumber: tables.gardens.number,
    })
    .from(tables.tenancies)
    .innerJoin(tables.gardens, eq(tables.tenancies.gardenId, tables.gardens.id))
    .where(eq(tables.tenancies.memberId, member.id))
    .orderBy(desc(tables.tenancies.startDate))
    .all();

  const memberPayments = db
    .select()
    .from(tables.payments)
    .where(eq(tables.payments.memberId, member.id))
    .orderBy(desc(tables.payments.year))
    .all();
  const openCents = memberPayments.reduce((sum, p) => sum + Math.max(0, p.amountCents - p.paidCents), 0);

  const hours = db
    .select()
    .from(tables.workHours)
    .where(eq(tables.workHours.memberId, member.id))
    .orderBy(desc(tables.workHours.date))
    .all();
  const currentYear = new Date().getFullYear();
  const hoursThisYear = hours.filter((h) => h.date.startsWith(String(currentYear))).reduce((sum, h) => sum + h.hours, 0);
  const exemption = getWorkExemption(member.id, currentYear);

  const letters = db
    .select()
    .from(tables.letters)
    .where(eq(tables.letters.memberId, member.id))
    .orderBy(desc(tables.letters.createdAt))
    .all();

  const updateAction = updateMember.bind(null, member.id);
  const statusAction = setMemberStatus.bind(null, member.id);
  const deleteAction = deleteMember.bind(null, member.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {member.firstName} {member.lastName}
          {member.status === "ausgeschieden" && (
            <span className="ml-3 rounded-full bg-stone-200 px-3 py-1 text-sm font-normal">ausgeschieden {formatDate(member.leftAt)}</span>
          )}
        </h1>
        <Link href="/admin/mitglieder" className={btn}>← Zur Liste</Link>
      </div>

      {query.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}
      {query.fehler === "verknuepft" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Löschen nicht möglich: Es gibt Pachtverhältnisse oder Zahlungen zu diesem Mitglied. Stattdessen als „ausgeschieden“ markieren.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={updateAction} className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Stammdaten</h2>
          <MemberFields values={member} />
          <button className={btnPrimary}>Speichern</button>
        </form>

        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">Gärten</h2>
            {tenancies.length === 0 && <p className="text-sm text-stone-500">Kein Pachtverhältnis.</p>}
            <ul className="space-y-1 text-sm">
              {tenancies.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/gaerten/${t.gardenId}`} className="text-green-800 hover:underline">
                    Garten {t.gardenNumber}
                  </Link>{" "}
                  · {formatDate(t.startDate)} – {t.endDate ? formatDate(t.endDate) : "heute"}
                </li>
              ))}
            </ul>
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">Arbeitsstunden {currentYear}</h2>
            <p className="text-sm">
              {exemption
                ? `Soll erfüllt durch ${exemption.reason}${hoursThisYear > 0 ? ` · zusätzlich ${hoursThisYear} Stunden erfasst` : ""}`
                : `${hoursThisYear} Stunden erfasst`}
            </p>
            <Link href={`/admin/arbeitsstunden?mitglied=${member.id}`} className="mt-2 inline-block text-sm text-green-700 hover:underline">
              Stunden verwalten →
            </Link>
          </section>

          {canManageMoney(user) && (
            <section className={card}>
              <h2 className="mb-3 text-lg font-semibold">Zahlungen</h2>
              <p className="text-sm">
                Offen: <strong className={openCents > 0 ? "text-red-700" : "text-green-700"}>{euro(openCents)}</strong>
              </p>
              {memberPayments.length > 0 && (
                <table className={`${tableClass} mt-3`}>
                  <thead>
                    <tr>
                      <th className={th}>Jahr</th>
                      <th className={th}>Posten</th>
                      <th className={th}>Betrag</th>
                      <th className={th}>Bezahlt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberPayments.slice(0, 8).map((p) => (
                      <tr key={p.id}>
                        <td className={td}>{p.year}</td>
                        <td className={td}>{p.description || p.type}</td>
                        <td className={td}>{euro(p.amountCents)}</td>
                        <td className={td}>{p.paidCents >= p.amountCents ? "✓" : euro(p.paidCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">Briefe</h2>
            {letters.length === 0 && <p className="text-sm text-stone-500">Keine Schreiben.</p>}
            <ul className="space-y-1 text-sm">
              {letters.map((letter) => (
                <li key={letter.id}>
                  <a href={`/api/briefe/${letter.id}`} className="text-green-800 hover:underline" target="_blank">
                    {letter.subject}
                  </a>{" "}
                  <span className="text-stone-400">({formatDate(letter.createdAt)})</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} space-y-3`}>
            <h2 className="text-lg font-semibold">Status</h2>
            <form action={statusAction} className="flex items-center gap-3">
              <input type="hidden" name="status" value={member.status === "aktiv" ? "ausgeschieden" : "aktiv"} />
              <button className={btn}>
                {member.status === "aktiv" ? "Als ausgeschieden markieren" : "Wieder als aktiv markieren"}
              </button>
            </form>
            {canAdminister(user) && (
              <form action={deleteAction}>
                <button className={btnDanger}>Endgültig löschen</button>
                <p className="mt-1 text-xs text-stone-500">Nur möglich, wenn keine Pachtverhältnisse oder Zahlungen existieren.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
