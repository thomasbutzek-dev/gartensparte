import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireMoneyRole } from "@/lib/auth";
import { DateField } from "@/components/DateField";
import { euro, formatDate, today } from "@/lib/format";
import { btn, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { addPayment, deletePayment, dunPayment, markPaid, reopenPayment } from "./actions";

const typeLabels: Record<string, string> = {
  beitrag: "Beitrag",
  pacht: "Pacht",
  strom: "Strom",
  arbeitsstunden: "Arbeitsstunden",
  umlage: "Umlage",
  sonstiges: "Sonstiges",
};

export default async function ZahlungenPage({ searchParams }: PageProps<"/admin/zahlungen">) {
  await requireMoneyRole();
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(params.jahr) || currentYear;
  const filter = typeof params.filter === "string" ? params.filter : "";

  const payments = db
    .select({
      id: tables.payments.id,
      memberId: tables.payments.memberId,
      gardenId: tables.payments.gardenId,
      year: tables.payments.year,
      type: tables.payments.type,
      description: tables.payments.description,
      amountCents: tables.payments.amountCents,
      paidCents: tables.payments.paidCents,
      paidAt: tables.payments.paidAt,
      dueDate: tables.payments.dueDate,
      dunningLevel: tables.payments.dunningLevel,
      letterId: tables.payments.letterId,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
    })
    .from(tables.payments)
    .innerJoin(tables.members, eq(tables.payments.memberId, tables.members.id))
    .where(eq(tables.payments.year, year))
    .orderBy(asc(tables.members.lastName), asc(tables.members.firstName), desc(tables.payments.id))
    .all();

  const filtered = payments.filter((p) => {
    const open = p.paidCents < p.amountCents;
    if (filter === "offen") return open;
    if (filter === "ueberfaellig") return open && p.dueDate !== null && p.dueDate < today();
    if (filter === "bezahlt") return !open;
    return true;
  });

  const openTotal = payments.filter((p) => p.paidCents < p.amountCents).reduce((sum, p) => sum + p.amountCents - p.paidCents, 0);
  const paidTotal = payments.reduce((sum, p) => sum + p.paidCents, 0);

  const members = db
    .select()
    .from(tables.members)
    .where(eq(tables.members.status, "aktiv"))
    .orderBy(asc(tables.members.lastName))
    .all();
  const allYears = [...new Set([currentYear, currentYear + 1, ...db.select({ year: tables.payments.year }).from(tables.payments).all().map((r) => r.year)])].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Zahlungen {year}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2">
            <select name="jahr" defaultValue={year} className={`${input} w-28`}>
              {allYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button className={btn}>Anzeigen</button>
          </form>
          <a href={`/admin/zahlungen/export?jahr=${year}`} className={btn}>CSV-Export</a>
        </div>
      </div>

      {params.ok === "zahlung" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Zahlung verbucht.</p>}
      {params.ok === "posten" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Posten angelegt.</p>}
      {params.ok === "mahnung" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Mahnung als Entwurf unter Briefe – Text prüfen, dann PDF erstellen.
        </p>
      )}
      {params.fehler === "eingabe" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Eingaben prüfen (Mitglied, Betrag).</p>}
      {params.fehler === "vorlage" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Briefvorlage fehlt – unter Briefe → Vorlagen anlegen.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <p className="text-sm text-stone-500">Offen {year}</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{euro(openTotal)}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-stone-500">Eingegangen {year}</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{euro(paidTotal)}</p>
        </div>
      </div>

      <p className="text-sm text-stone-500">
        Hier die offenen Posten und Eingänge. Jahresrechnungen starten unter{" "}
        <Link href="/admin/schriftverkehr#rechnungslauf" className="text-green-700 hover:underline">Briefe</Link>.
      </p>

      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Posten manuell anlegen</h2>
        <form action={addPayment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className={label} htmlFor="pMember">Mitglied</label>
            <select id="pMember" name="memberId" required className={input}>
              <option value="">Bitte wählen…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pType">Art</label>
            <select id="pType" name="type" className={input}>
              {Object.entries(typeLabels).map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pYear">Jahr</label>
            <input id="pYear" name="year" type="number" defaultValue={year} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pAmount">Betrag (€)</label>
            <input id="pAmount" name="amount" required inputMode="decimal" placeholder="z.B. 40,00" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pDue">Fällig am</label>
            <DateField id="pDue" name="dueDate" />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <label className={label} htmlFor="pDesc">Beschreibung</label>
            <input id="pDesc" name="description" className={input} placeholder="z.B. Wasserumlage" />
          </div>
          <div className="flex items-end">
            <button className={btnPrimary}>Anlegen</button>
          </div>
        </form>
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["", "Alle"],
          ["offen", "Offen"],
          ["ueberfaellig", "Überfällig"],
          ["bezahlt", "Bezahlt"],
        ].map(([value, text]) => (
          <Link
            key={value}
            href={`/admin/zahlungen?jahr=${year}${value ? `&filter=${value}` : ""}`}
            className={`rounded-full px-3 py-1 ${filter === value ? "bg-green-700 text-white" : "bg-stone-200 hover:bg-stone-300"}`}
          >
            {text}
          </Link>
        ))}
      </div>

      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Mitglied</th>
              <th className={th}>Posten</th>
              <th className={th}>Betrag</th>
              <th className={th}>Fällig</th>
              <th className={th}>Status</th>
              <th className={th}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const openCents = p.amountCents - p.paidCents;
              const overdue = openCents > 0 && p.dueDate !== null && p.dueDate < today();
              return (
                <tr key={p.id} className={overdue ? "bg-red-50" : undefined}>
                  <td className={td}>
                    <Link href={`/admin/mitglieder/${p.memberId}`} className="text-green-800 hover:underline">
                      {p.lastName}, {p.firstName}
                    </Link>
                  </td>
                  <td className={td}>
                    {p.description || typeLabels[p.type]}
                    {p.letterId && (
                      <a href={`/api/briefe/${p.letterId}`} target="_blank" className="ml-2 text-xs text-green-700 hover:underline">
                        Rechnung
                      </a>
                    )}
                  </td>
                  <td className={td}>{euro(p.amountCents)}</td>
                  <td className={td}>
                    {formatDate(p.dueDate)}
                    {p.dunningLevel > 0 && <span className="ml-1 text-xs text-amber-700">({p.dunningLevel}. Mahnung)</span>}
                  </td>
                  <td className={td}>
                    {openCents <= 0 ? (
                      <span className="text-green-700">bezahlt {formatDate(p.paidAt)}</span>
                    ) : (
                      <span className={overdue ? "font-medium text-red-700" : "text-stone-600"}>offen {euro(openCents)}</span>
                    )}
                  </td>
                  <td className={`${td} space-y-1`}>
                    {openCents > 0 ? (
                      <>
                        <form action={markPaid.bind(null, p.id)} className="flex items-center gap-1">
                          <input name="amount" placeholder={(openCents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} className="w-20 rounded border border-stone-300 px-2 py-1 text-xs" inputMode="decimal" />
                          <button className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-800">Bezahlt</button>
                        </form>
                        {p.dunningLevel < 2 && (
                          <form action={dunPayment.bind(null, p.id)}>
                            <button className="text-xs text-amber-700 hover:underline">{p.dunningLevel === 0 ? "Erinnern" : "2. Mahnung"}</button>
                          </form>
                        )}
                      </>
                    ) : (
                      <form action={reopenPayment.bind(null, p.id)}>
                        <button className="text-xs text-stone-500 hover:underline">Wieder öffnen</button>
                      </form>
                    )}
                    <form action={deletePayment.bind(null, p.id)}>
                      <button className="text-xs text-red-700 hover:underline">Löschen</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className={td} colSpan={6}>Keine Posten für diese Auswahl.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
