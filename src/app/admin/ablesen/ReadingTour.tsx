import Link from "next/link";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { DateField } from "@/components/DateField";
import SaveButton from "@/components/SaveButton";
import { formatDate, today } from "@/lib/format";
import { firstTourGarden, isMeterGarden, meterKind, meterNumberOf, readInYear, type MeterKind } from "@/lib/readings";
import { btn, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { saveMeterNumber, saveReading } from "./actions";

type GardenRow = (typeof tables.gardens)["$inferSelect"];
type ReadingRow = (typeof tables.meterReadings)["$inferSelect"];

export default async function ReadingTour({
  kind,
  searchParams,
}: {
  kind: MeterKind;
  searchParams: Promise<{ nr?: string; stand?: string; ok?: string; fehler?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const meta = meterKind[kind];
  const gardens = db
    .select()
    .from(tables.gardens)
    .orderBy(asc(tables.gardens.number))
    .all()
    .filter((garden) => garden.status !== "entfaellt");
  const readings = db
    .select()
    .from(tables.meterReadings)
    .where(eq(tables.meterReadings.kind, kind))
    .orderBy(desc(tables.meterReadings.date), desc(tables.meterReadings.id))
    .all();
  const latestByGarden = new Map<number, ReadingRow>();
  for (const reading of readings) {
    if (!latestByGarden.has(reading.gardenId)) latestByGarden.set(reading.gardenId, reading);
  }

  if (params.nr) {
    const garden = gardens.find((item) => item.number === Number(params.nr));
    if (garden) {
      const last = latestByGarden.get(garden.id);
      const number = meterNumberOf(garden, kind);
      const tenant = db
        .select({ firstName: tables.members.firstName, lastName: tables.members.lastName })
        .from(tables.tenancies)
        .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
        .where(and(eq(tables.tenancies.gardenId, garden.id), isNull(tables.tenancies.endDate)))
        .all()
        .at(0);
      const action = saveReading.bind(null, garden.id, kind);
      return (
        <div className="mx-auto max-w-md space-y-5">
          <h1 className="text-2xl font-bold">Garten {garden.number} ablesen</h1>
          {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}
          {params.fehler === "wert" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte einen gültigen Zählerstand eingeben.</p>}
          <div className={card}>
            <p className="text-sm text-stone-500">
              {tenant ? `Pächter: ${tenant.firstName} ${tenant.lastName}` : "Kein Pächter"}
              {number ? ` · ${meta.numberLabel} ${number}` : ` · Keine ${meta.numberLabel} hinterlegt`}
            </p>
            {last && (
              <p className="mt-2 text-sm">
                Letzter Stand: <strong>{last.value.toLocaleString("de-DE")} {meta.unit}</strong> ({formatDate(last.date)})
              </p>
            )}
          </div>
          <form action={action} className={`${card} space-y-4`}>
            <div>
              <label className={label} htmlFor="value">Neuer Zählerstand ({meta.unit})</label>
              <input id="value" name="value" required inputMode="decimal" autoFocus className={`${input} text-2xl`} placeholder={meta.placeholder} />
            </div>
            <div>
              <label className={label} htmlFor="date">Datum</label>
              <DateField id="date" name="date" defaultValue={today()} />
            </div>
            <div>
              <label className={label} htmlFor="note">Bemerkung (z.B. Zählerwechsel)</label>
              <input id="note" name="note" className={input} />
            </div>
            <div className="flex flex-wrap gap-3">
              <SaveButton name="weiter" value="1" className={`${btnPrimary} flex-1 justify-center py-3`}>
                Speichern & nächster Garten
              </SaveButton>
              <SaveButton className={btn}>Nur speichern</SaveButton>
            </div>
          </form>
          <p className="text-center text-sm">
            <Link href={meta.path} className="text-stone-500 hover:underline">Zur Übersicht</Link>
          </p>
        </div>
      );
    }
  }

  const currentYear = String(new Date().getFullYear());
  const stand = params.stand === "erledigt" || params.stand === "alle" ? params.stand : "offen";
  const withMeter = gardens.filter((garden) => isMeterGarden(garden, kind));
  const readThisYear = withMeter.filter((garden) => readInYear(latestByGarden.get(garden.id)?.date, currentYear));
  const stillOpen = gardens.filter((garden) => !readInYear(latestByGarden.get(garden.id)?.date, currentYear));
  const listed = stand === "erledigt" ? readThisYear : stand === "alle" ? gardens : stillOpen;
  const tourStart = firstTourGarden(gardens, latestByGarden, currentYear, kind);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{meta.title}</h1>
        {tourStart && (
          <Link href={`${meta.path}?nr=${tourStart.number}`} className={btnPrimary}>
            Ablese-Tour starten
          </Link>
        )}
      </div>
      {params.ok === "zaehler" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">{meta.numberLabel} gespeichert.</p>
      )}
      <p className="text-sm text-stone-500">
        {withMeter.length === 0
          ? `${meta.numberLabel} in der Liste eintragen. Die Tour nimmt nur Gärten mit Zähler.`
          : `${readThisYear.length} von ${withMeter.length} mit Zähler ${currentYear} abgelesen.`}
        {" "}Abrechnung: unter{" "}
        <Link href="/admin/zahlungen" className="text-green-700 hover:underline">Zahlungen</Link> den Jahreslauf erzeugen.
      </p>
      <form className="flex flex-wrap items-end gap-2" action={meta.path}>
        <div>
          <label className={label} htmlFor="nr">Garten-Nr.</label>
          <input id="nr" name="nr" inputMode="numeric" className={`${input} w-28`} placeholder="z.B. 12" />
        </div>
        <button className={btn}>Ablesen</button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["offen", "Noch offen"],
          ["erledigt", "Dieses Jahr erledigt"],
          ["alle", "Alle"],
        ].map(([value, text]) => (
          <Link
            key={value}
            href={value === "offen" ? meta.path : `${meta.path}?stand=${value}`}
            className={`rounded-full px-3 py-1 ${stand === value ? "bg-green-700 text-white" : "bg-stone-200 hover:bg-stone-300"}`}
          >
            {text}
          </Link>
        ))}
      </div>
      <div className="md:hidden">
        <details className={card}>
          <summary className="cursor-pointer font-medium">Liste anzeigen ({listed.length})</summary>
          <div className="mt-3">
            <ReadingTable gardens={listed} latestByGarden={latestByGarden} currentYear={currentYear} stand={stand} kind={kind} />
          </div>
        </details>
      </div>
      <div className={`hidden md:block ${card}`}>
        <ReadingTable gardens={listed} latestByGarden={latestByGarden} currentYear={currentYear} stand={stand} kind={kind} />
      </div>
    </div>
  );
}

function ReadingTable({
  gardens,
  latestByGarden,
  currentYear,
  stand,
  kind,
}: {
  gardens: GardenRow[];
  latestByGarden: Map<number, ReadingRow>;
  currentYear: string;
  stand: string;
  kind: MeterKind;
}) {
  const meta = meterKind[kind];
  return (
    <table className={tableClass}>
      <thead>
        <tr>
          <th className={th}>Garten</th>
          <th className={th}>{meta.numberLabel}</th>
          <th className={th}>Letzter Stand</th>
          <th className={`${th} hidden sm:table-cell`}>Datum</th>
          <th className={th}>{currentYear} abgelesen?</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody>
        {gardens.map((garden) => {
          const last = latestByGarden.get(garden.id);
          const done = readInYear(last?.date, currentYear);
          return (
            <tr key={garden.id}>
              <td className={td}>
                <Link href={`/admin/gaerten/${garden.id}`} className="text-green-800 hover:underline">
                  Garten {garden.number}
                </Link>
              </td>
              <td className={td}>
                <form action={saveMeterNumber.bind(null, garden.id, kind)} className="flex items-center gap-1">
                  <input type="hidden" name="stand" value={stand} />
                  <input
                    name="meterNumber"
                    defaultValue={meterNumberOf(garden, kind)}
                    aria-label={`${meta.numberLabel} Garten ${garden.number}`}
                    className="w-32 rounded border border-stone-300 px-2 py-1 text-sm"
                    placeholder="Nr. eintragen"
                  />
                  <button className="text-xs text-green-700 hover:underline">Speichern</button>
                </form>
              </td>
              <td className={td}>{last ? `${last.value.toLocaleString("de-DE")} ${meta.unit}` : "–"}</td>
              <td className={`${td} hidden sm:table-cell`}>{last ? formatDate(last.date) : "–"}</td>
              <td className={td}>{done ? "✓" : <span className="text-amber-600">fehlt</span>}</td>
              <td className={td}>
                <Link href={`${meta.path}?nr=${garden.number}`} className="text-sm text-green-700 hover:underline">
                  Ablesen
                </Link>
              </td>
            </tr>
          );
        })}
        {gardens.length === 0 && (
          <tr>
            <td className={td} colSpan={6}>Keine Gärten für diese Auswahl.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
