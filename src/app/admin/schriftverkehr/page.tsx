import Link from "next/link";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { btn, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { createCircular, createTermination, deleteLetter } from "./actions";

const typeLabels: Record<string, string> = {
  rechnung: "Rechnung",
  mahnung: "Mahnung",
  kuendigung: "Kündigung",
  rundschreiben: "Rundschreiben",
};

export default async function SchriftverkehrPage({ searchParams }: PageProps<"/admin/schriftverkehr">) {
  await requireUser();
  const params = await searchParams;
  const typeFilter = typeof params.typ === "string" ? params.typ : "";

  const letters = db
    .select({
      id: tables.letters.id,
      type: tables.letters.type,
      number: tables.letters.number,
      subject: tables.letters.subject,
      createdAt: tables.letters.createdAt,
      memberId: tables.letters.memberId,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
    })
    .from(tables.letters)
    .leftJoin(tables.members, eq(tables.letters.memberId, tables.members.id))
    .orderBy(desc(tables.letters.createdAt))
    .all()
    .filter((letter) => !typeFilter || letter.type === typeFilter);

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
        <h1 className="text-2xl font-bold">Schriftverkehr</h1>
        <Link href="/admin/schriftverkehr/vorlagen" className={btn}>Vorlagen bearbeiten</Link>
      </div>

      {params.ok && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Schreiben erstellt –{" "}
          <a href={`/api/briefe/${params.ok}`} target="_blank" className="underline">PDF öffnen</a>.
          {params.hinweis === "schriftform" && (
            <span className="mt-1 block text-sm">
              Wichtig: Kündigungen müssen unterschrieben und nachweisbar zugestellt werden (Einwurf-Einschreiben oder Übergabe mit Zeugen).
            </span>
          )}
        </p>
      )}
      {params.fehler === "eingabe" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte alle Pflichtfelder ausfüllen.</p>}
      {params.fehler === "mitglieder" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Keine aktiven Mitglieder vorhanden.</p>}

      <p className="text-sm text-stone-500">
        Rechnungen entstehen über den <Link href="/admin/zahlungen" className="text-green-700 hover:underline">Rechnungslauf</Link>,
        Mahnungen direkt bei den offenen Posten. Hier: Kündigungen, Rundschreiben und das Archiv aller PDFs.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">Kündigung erstellen</h2>
          <form action={createTermination} className="space-y-3">
            <div>
              <label className={label} htmlFor="kPaar">Pächter / Garten</label>
              <select id="kPaar" name="paar" required className={input}>
                <option value="">Bitte wählen…</option>
                {activeTenancies.map((t) => (
                  <option key={`${t.memberId}-${t.gardenId}`} value={`${t.memberId}:${t.gardenId}`}>
                    Garten {t.gardenNumber} – {t.lastName}, {t.firstName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="kFrist">Kündigung zum</label>
                <input id="kFrist" name="frist" type="date" required defaultValue={`${new Date().getFullYear()}-11-30`} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="kGrund">Grund</label>
                <input id="kGrund" name="grund" className={input} placeholder="z.B. § 9 BKleingG" />
              </div>
            </div>
            <button className={btnPrimary}>Kündigungsschreiben erstellen</button>
            <p className="text-xs text-stone-500">
              Setzt den Gartenstatus auf „Kündigung“ und legt einen Chronik-Eintrag an. Das PDF muss unterschrieben und
              nachweisbar zugestellt werden.
            </p>
          </form>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">Rundschreiben an alle aktiven Mitglieder</h2>
          <form action={createCircular} className="space-y-3">
            <div>
              <label className={label} htmlFor="rSubject">Betreff</label>
              <input id="rSubject" name="subject" required className={input} placeholder="z.B. Einladung Mitgliederversammlung" />
            </div>
            <div>
              <label className={label} htmlFor="rText">Text</label>
              <textarea id="rText" name="text" rows={6} required className={input} />
            </div>
            <button className={btnPrimary}>Sammel-PDF erstellen</button>
            <p className="text-xs text-stone-500">Erzeugt eine PDF-Datei mit einem adressierten Brief pro Mitglied – fertig zum Drucken.</p>
          </form>
        </section>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[["", "Alle"], ...Object.entries(typeLabels)].map(([value, text]) => (
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
                <td className={td}>{typeLabels[letter.type]}{letter.number ? ` ${letter.number}` : ""}</td>
                <td className={td}>
                  <a href={`/api/briefe/${letter.id}`} target="_blank" className="text-green-800 hover:underline">
                    {letter.subject}
                  </a>
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
