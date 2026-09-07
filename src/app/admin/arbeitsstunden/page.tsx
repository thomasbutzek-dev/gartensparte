import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { DateField } from "@/components/DateField";
import { euro, formatDate, today } from "@/lib/format";
import { btn, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { creditedWorkHours, listWorkDutyOptions, workExemptionsForYear } from "@/lib/work-hours";
import DutyForm from "./DutyForm";
import { addWorkHours, clearWorkExemption, deleteWorkHours } from "./actions";

export default async function ArbeitsstundenPage({ searchParams }: PageProps<"/admin/arbeitsstunden">) {
  await requireUser();
  const params = await searchParams;
  const settings = getSettings();
  const year = Number(params.jahr) || new Date().getFullYear();
  const selectedMemberId = Number(params.mitglied) || 0;

  const members = db
    .select()
    .from(tables.members)
    .where(eq(tables.members.status, "aktiv"))
    .orderBy(asc(tables.members.lastName), asc(tables.members.firstName))
    .all();
  const allHours = db.select().from(tables.workHours).orderBy(desc(tables.workHours.date)).all();
  const yearHours = allHours.filter((h) => h.date.startsWith(String(year)));
  const sumByMember = new Map<number, number>();
  for (const entry of yearHours) {
    sumByMember.set(entry.memberId, (sumByMember.get(entry.memberId) ?? 0) + entry.hours);
  }

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;
  const memberEntries = selectedMember ? yearHours.filter((h) => h.memberId === selectedMember.id) : [];
  const exemptions = workExemptionsForYear(year);
  const exemptionByMember = new Map(exemptions.map((item) => [item.memberId, item.reason]));
  const selectedExemption = selectedMember ? exemptionByMember.get(selectedMember.id) ?? null : null;
  const dutyOptions = listWorkDutyOptions();

  const years = [...new Set([new Date().getFullYear(), ...allHours.map((h) => Number(h.date.slice(0, 4)))])].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Arbeitsstunden {year}</h1>
        <form className="flex items-center gap-2">
          <select name="jahr" defaultValue={year} className={`${input} w-28`}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className={btn}>Anzeigen</button>
        </form>
      </div>
      <p className="text-sm text-stone-500">
        Soll: {settings.arbeitsstundenSoll} Stunden pro Mitglied und Jahr. Fehlstunden werden mit {euro(settings.arbeitsstundenSatzCents)}/Stunde
        berechnet (beim Rechnungslauf unter Zahlungen). Sondertätigkeiten zählen für das jeweilige Jahr als erfüllt.
      </p>

      {params.ok === "befreiung" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Sondertätigkeit für {year} gespeichert. Das Soll gilt als erfüllt.</p>
      )}
      {params.ok && params.ok !== "befreiung" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Eintrag gespeichert.</p>}
      {params.fehler === "befreiung" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Mitglied und die Tätigkeit angeben.</p>
      )}
      {params.fehler && params.fehler !== "befreiung" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Mitglied, Datum und Stunden (0,25–24) angeben.</p>
      )}

      <form action={addWorkHours} className={`${card} flex flex-wrap items-end gap-3`}>
        <div>
          <label className={label} htmlFor="memberId">Mitglied</label>
          <select id="memberId" name="memberId" required defaultValue={selectedMemberId || ""} className={`${input} w-56`}>
            <option value="">Bitte wählen…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="date">Datum</label>
          <DateField id="date" name="date" defaultValue={today()} required />
        </div>
        <div>
          <label className={label} htmlFor="hours">Stunden</label>
          <input id="hours" name="hours" required inputMode="decimal" placeholder="z.B. 2,5" className={`${input} w-24`} />
        </div>
        <div className="min-w-48 flex-1">
          <label className={label} htmlFor="activity">Tätigkeit</label>
          <input id="activity" name="activity" placeholder="z.B. Gemeinschaftsarbeit Wege" className={input} />
        </div>
        <button className={btnPrimary}>Erfassen</button>
      </form>

      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Befreiung oder Sondertätigkeit</h2>
        <p className="text-sm text-stone-500">
          Vorstand, Wegbeauftragte und ähnliche Ämter leisten keine Einzelstunden. Für das Jahr gilt das Soll als erfüllt,
          im Rechnungslauf entstehen keine Fehlstunden.
        </p>
        <DutyForm
          members={members}
          year={year}
          selectedMemberId={selectedMemberId}
          options={dutyOptions}
          currentReason={selectedExemption}
        />
        {selectedMember && selectedExemption && (
          <form action={clearWorkExemption.bind(null, selectedMember.id, year)}>
            <p className="text-sm text-stone-700">
              {selectedMember.firstName} {selectedMember.lastName}: {selectedExemption} in {year}.
            </p>
            <button className="mt-1 text-sm text-red-700 hover:underline">Für {year} aufheben</button>
          </form>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-3 text-lg font-semibold">Soll/Ist pro Mitglied</h2>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Mitglied</th>
                <th className={th}>Ist</th>
                <th className={th}>Soll</th>
                <th className={th}>Differenz</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const logged = sumByMember.get(m.id) ?? 0;
                const reason = exemptionByMember.get(m.id);
                const done = creditedWorkHours(logged, Boolean(reason), settings.arbeitsstundenSoll);
                const diff = done - settings.arbeitsstundenSoll;
                return (
                  <tr key={m.id} className={m.id === selectedMemberId ? "bg-green-50" : undefined}>
                    <td className={td}>
                      <Link href={`/admin/arbeitsstunden?jahr=${year}&mitglied=${m.id}`} className="text-green-800 hover:underline">
                        {m.lastName}, {m.firstName}
                      </Link>
                      {reason ? <span className="block text-xs text-stone-500">{reason}</span> : null}
                    </td>
                    <td className={td}>{done}</td>
                    <td className={td}>{settings.arbeitsstundenSoll}</td>
                    <td className={`${td} ${diff < 0 ? "text-red-700" : "text-green-700"}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={card}>
          <h2 className="mb-3 text-lg font-semibold">
            {selectedMember ? `Einträge: ${selectedMember.firstName} ${selectedMember.lastName}` : "Einträge"}
          </h2>
          {!selectedMember && <p className="text-sm text-stone-500">Links ein Mitglied anklicken, um Einträge zu sehen.</p>}
          {selectedMember && memberEntries.length === 0 && <p className="text-sm text-stone-500">Keine Einträge in {year}.</p>}
          <ul className="space-y-2 text-sm">
            {memberEntries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {formatDate(entry.date)}: <strong>{entry.hours} h</strong>
                  {entry.activity && <span className="text-stone-500"> · {entry.activity}</span>}
                </span>
                <form action={deleteWorkHours.bind(null, entry.id, entry.memberId)}>
                  <button className="text-xs text-red-700 hover:underline">Löschen</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
