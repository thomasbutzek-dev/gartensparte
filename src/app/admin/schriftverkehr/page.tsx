import Link from "next/link";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser, canSeeMoney } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { archiveTypeLabels } from "@/lib/letter-catalog";
import { btn, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { runAnnualInvoices } from "@/app/admin/zahlungen/actions";
import { deleteLetter } from "./actions";
import LetterComposer from "./LetterComposer";

export default async function SchriftverkehrPage({ searchParams }: PageProps<"/admin/schriftverkehr">) {
  const user = await requireUser();
  const params = await searchParams;
  const runYear = new Date().getFullYear();
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
    .filter((template) => template.type !== "rechnung")
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

      {typeof params.lauf === "string" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Rechnungslauf abgeschlossen: {params.lauf} Rechnung(en) erstellt, {params.uebersprungen ?? 0} Mitglied(er) übersprungen (bereits abgerechnet).
          Die PDFs stehen unten im Archiv. Offene Posten unter{" "}
          <Link href="/admin/zahlungen" className="underline">Zahlungen</Link>.
        </p>
      )}
      {params.fehler === "jahr" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte ein gültiges Jahr angeben.</p>}
      {params.fehler === "vorlage" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Briefvorlage fehlt – unter{" "}
          <Link href="/admin/schriftverkehr/vorlagen" className="underline">Vorlagen</Link> anlegen.
        </p>
      )}

      <p className="text-sm text-stone-500">
        Erst der Entwurf, dann das PDF. Mahnungen zu offenen Posten können Sie auch unter{" "}
        <Link href="/admin/zahlungen" className="text-green-700 hover:underline">Zahlungen</Link> anstoßen.
      </p>

      {canSeeMoney(user) && (
        <section id="rechnungslauf" className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">Jahresrechnungen</h2>
          <p className="text-sm text-stone-500">
            Erstellt pro Mitglied mit Garten eine Rechnung (Pacht, Beitrag, Strom, fehlende Arbeitsstunden des Vorjahres, Umlage)
            samt PDF. Bereits abgerechnete Mitglieder werden übersprungen. Sätze unter Einstellungen.
          </p>
          <form action={runAnnualInvoices} className="flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="runYear">Abrechnungsjahr</label>
              <input id="runYear" name="year" type="number" defaultValue={runYear} className={`${input} w-28`} />
            </div>
            <button className={btnPrimary}>Rechnungslauf starten</button>
          </form>
        </section>
      )}

      <LetterComposer templates={templates} tenancies={activeTenancies} />

      <div className="flex flex-wrap gap-2 text-sm">
        {[["", "Alle"], ["entwurf", "Entwürfe"], ...Object.entries(archiveTypeLabels)].map(([value, text]) => (
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
                  {archiveTypeLabels[letter.type] ?? letter.type}
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
