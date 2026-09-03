import Link from "next/link";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate, today } from "@/lib/format";
import { btn, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { saveReading } from "./actions";

export default async function AblesenPage({ searchParams }: PageProps<"/admin/ablesen">) {
  await requireUser();
  const params = await searchParams;
  const gardens = db.select().from(tables.gardens).orderBy(asc(tables.gardens.number)).all();
  const readings = db.select().from(tables.meterReadings).orderBy(desc(tables.meterReadings.date), desc(tables.meterReadings.id)).all();
  const latestByGarden = new Map<number, (typeof readings)[number]>();
  for (const reading of readings) {
    if (!latestByGarden.has(reading.gardenId)) latestByGarden.set(reading.gardenId, reading);
  }

  // Erfassungsmodus für einen Garten
  if (params.nr) {
    const garden = gardens.find((g) => g.number === Number(params.nr));
    if (garden) {
      const last = latestByGarden.get(garden.id);
      const tenant = db
        .select({ firstName: tables.members.firstName, lastName: tables.members.lastName })
        .from(tables.tenancies)
        .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
        .where(and(eq(tables.tenancies.gardenId, garden.id), isNull(tables.tenancies.endDate)))
        .all()
        .at(0);
      const action = saveReading.bind(null, garden.id);
      return (
        <div className="mx-auto max-w-md space-y-5">
          <h1 className="text-2xl font-bold">Garten {garden.number} ablesen</h1>
          {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}
          {params.fehler === "wert" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte einen gültigen Zählerstand eingeben.</p>}
          <div className={card}>
            <p className="text-sm text-stone-500">
              {tenant ? `Pächter: ${tenant.firstName} ${tenant.lastName}` : "Kein Pächter"}
              {garden.meterNumber ? ` · Zähler-Nr. ${garden.meterNumber}` : " · Keine Zähler-Nr. hinterlegt"}
            </p>
            {last && (
              <p className="mt-2 text-sm">
                Letzter Stand: <strong>{last.value.toLocaleString("de-DE")} kWh</strong> ({formatDate(last.date)})
              </p>
            )}
          </div>
          <form action={action} className={`${card} space-y-4`}>
            <div>
              <label className={label} htmlFor="value">Neuer Zählerstand (kWh)</label>
              <input id="value" name="value" required inputMode="decimal" autoFocus className={`${input} text-2xl`} placeholder="z.B. 1534,7" />
            </div>
            <div>
              <label className={label} htmlFor="date">Datum</label>
              <input id="date" name="date" type="date" defaultValue={today()} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="note">Bemerkung (z.B. Zählerwechsel)</label>
              <input id="note" name="note" className={input} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button name="weiter" value="1" className={`${btnPrimary} flex-1 justify-center py-3`}>
                Speichern & nächster Garten
              </button>
              <button className={btn}>Nur speichern</button>
            </div>
          </form>
          <p className="text-center text-sm">
            <Link href="/admin/ablesen" className="text-stone-500 hover:underline">Zur Übersicht</Link>
          </p>
        </div>
      );
    }
  }

  const currentYear = String(new Date().getFullYear());
  const firstWithMeter = gardens.find((g) => g.meterNumber) ?? gardens[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Stromzähler</h1>
        {firstWithMeter && (
          <Link href={`/admin/ablesen?nr=${firstWithMeter.number}`} className={btnPrimary}>
            Ablese-Tour starten
          </Link>
        )}
      </div>
      <p className="text-sm text-stone-500">
        Die Ablese-Tour führt Garten für Garten durch die Anlage – gemacht fürs Handy. Abrechnung: unter{" "}
        <Link href="/admin/zahlungen" className="text-green-700 hover:underline">Zahlungen</Link> den Jahreslauf erzeugen.
      </p>
      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Garten</th>
              <th className={th}>Zähler-Nr.</th>
              <th className={th}>Letzter Stand</th>
              <th className={th}>Datum</th>
              <th className={th}>{currentYear} abgelesen?</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {gardens.map((garden) => {
              const last = latestByGarden.get(garden.id);
              const readThisYear = last?.date.startsWith(currentYear) ?? false;
              return (
                <tr key={garden.id}>
                  <td className={td}>
                    <Link href={`/admin/gaerten/${garden.id}`} className="text-green-800 hover:underline">
                      Garten {garden.number}
                    </Link>
                  </td>
                  <td className={td}>{garden.meterNumber || "–"}</td>
                  <td className={td}>{last ? `${last.value.toLocaleString("de-DE")} kWh` : "–"}</td>
                  <td className={td}>{last ? formatDate(last.date) : "–"}</td>
                  <td className={td}>{readThisYear ? "✓" : <span className="text-amber-600">fehlt</span>}</td>
                  <td className={td}>
                    <Link href={`/admin/ablesen?nr=${garden.number}`} className="text-sm text-green-700 hover:underline">
                      Ablesen
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
