import Link from "next/link";
import { asc, desc, eq, isNull, notInArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser, canSeeMoney } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { boardArchiveTypeLabels, isMoneyLetterGroup } from "@/lib/letter-catalog";
import { btn, card, tableClass, td, th } from "@/lib/ui";
import { deleteLetter } from "./actions";
import LetterComposer from "./LetterComposer";

const MONEY_TYPES = ["rechnung", "mahnung"] as const;

export default async function SchriftverkehrPage({ searchParams }: PageProps<"/admin/schriftverkehr">) {
  const user = await requireUser();
  const params = await searchParams;
  const typeFilter = typeof params.typ === "string" ? params.typ : "";

  const letters = db
    .select({
      id: tables.letters.id,
      type: tables.letters.type,
      number: tables.letters.number,
      subject: tables.letters.subject,
      status: tables.letters.status,
      createdAt: tables.letters.createdAt,
      memberId: tables.letters.memberId,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
    })
    .from(tables.letters)
    .leftJoin(tables.members, eq(tables.letters.memberId, tables.members.id))
    .where(notInArray(tables.letters.type, [...MONEY_TYPES]))
    .orderBy(desc(tables.letters.createdAt))
    .all()
    .filter((letter) => {
      if (typeFilter === "entwurf") return letter.status === "entwurf";
      return !typeFilter || letter.type === typeFilter;
    });

  const templates = db
    .select()
    .from(tables.letterTemplates)
    .orderBy(asc(tables.letterTemplates.letterGroup), asc(tables.letterTemplates.name))
    .all()
    .filter((template) => !isMoneyLetterGroup(template.letterGroup))
    .map((template) => ({
      id: template.id,
      type: template.type,
      name: template.name || template.type,
      letterGroup: template.letterGroup,
    }));

  const activeTenancies = db
    .select({
      memberId: tables.members.id,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
      gardenId: tables.gardens.id,
      gardenNumber: tables.gardens.number,
    })
    .from(tables.tenancies)
    .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
    .innerJoin(tables.gardens, eq(tables.tenancies.gardenId, tables.gardens.id))
    .where(isNull(tables.tenancies.endDate))
    .orderBy(asc(tables.gardens.number))
    .all();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Briefe</h1>
        <Link href="/admin/schriftverkehr/vorlagen" className={btn}>Vorlagen bearbeiten</Link>
      </div>

      {params.ok && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Schreiben erstellt –{" "}
          <a href={`/api/briefe/${params.ok}`} target="_blank" className="underline">PDF öffnen</a>.
          {params.hinweis === "schriftform" && (
            <span className="mt-1 block text-sm">
              Kündigung: unterschreiben und den Zugang nachweisen (Einwurf-Einschreiben oder Übergabe mit Zeugen).
            </span>
          )}
        </p>
      )}
      {params.fehler === "eingabe" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Empfänger und die nötigen Angaben eintragen.</p>}
      {params.fehler === "mitglieder" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Keine aktiven Mitglieder vorhanden.</p>}
      {params.fehler === "vorlage" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Briefvorlage fehlt – unter{" "}
          <Link href="/admin/schriftverkehr/vorlagen" className="underline">Vorlagen</Link> anlegen.
        </p>
      )}

      <p className="text-sm text-stone-500">
        Abmahnungen, Kündigungen und Rundschreiben.
        {canSeeMoney(user) ? " Rechnungen und Mahnungen liegen unter Zahlungen." : ""}
      </p>

      <LetterComposer templates={templates} tenancies={activeTenancies} />

      <div className="flex flex-wrap gap-2 text-sm">
        {[["", "Alle"], ["entwurf", "Entwürfe"], ...Object.entries(boardArchiveTypeLabels)].map(([value, text]) => (
          <Link
            key={value}
            href={`/admin/schriftverkehr${value ? `?typ=${value}` : ""}`}
            className={`rounded-full px-3 py-1 ${typeFilter === value ? "bg-green-700 text-white" : "bg-stone-200 hover:bg-stone-300"}`}
          >
            {text}
          </Link>
        ))}
      </div>

      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Datum</th>
              <th className={th}>Art</th>
              <th className={th}>Betreff</th>
              <th className={th}>Empfänger</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {letters.map((letter) => (
              <tr key={letter.id}>
                <td className={td}>{formatDate(letter.createdAt)}</td>
                <td className={td}>
                  {letter.status === "entwurf" ? "Entwurf · " : ""}
                  {boardArchiveTypeLabels[letter.type] ?? letter.type}
                  {letter.number && !letter.number.startsWith("zahlung-") ? ` ${letter.number}` : ""}
                </td>
                <td className={td}>
                  {letter.status === "entwurf" ? (
                    <Link href={`/admin/schriftverkehr/${letter.id}`} className="text-green-800 hover:underline">
                      {letter.subject}
                    </Link>
                  ) : (
                    <a href={`/api/briefe/${letter.id}`} target="_blank" className="text-green-800 hover:underline">
                      {letter.subject}
                    </a>
                  )}
                </td>
                <td className={td}>
                  {letter.memberId ? (
                    <Link href={`/admin/mitglieder/${letter.memberId}`} className="text-green-800 hover:underline">
                      {letter.lastName}, {letter.firstName}
                    </Link>
                  ) : (
                    "Alle Mitglieder"
                  )}
                </td>
                <td className={td}>
                  <form action={deleteLetter.bind(null, letter.id)}>
                    <button className="text-xs text-red-700 hover:underline">Löschen</button>
                  </form>
                </td>
              </tr>
            ))}
            {letters.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>Noch keine Schreiben.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
