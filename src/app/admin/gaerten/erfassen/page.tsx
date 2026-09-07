import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { DateField } from "@/components/DateField";
import { today } from "@/lib/format";
import { btn, btnPrimary, card, gardenStatusLabels, input, label } from "@/lib/ui";
import { quickSaveGarden } from "../actions";

export default async function SchnellerfassungPage({ searchParams }: PageProps<"/admin/gaerten/erfassen">) {
  await requireUser();
  const params = await searchParams;
  const number = Number(params.nr || 1);
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.number, number)).get();
  if (!garden) redirect("/admin/gaerten");

  const currentTenancy = db
    .select({ memberId: tables.tenancies.memberId, startDate: tables.tenancies.startDate })
    .from(tables.tenancies)
    .where(and(eq(tables.tenancies.gardenId, garden.id), isNull(tables.tenancies.endDate)))
    .get();

  const activeMembers = db
    .select()
    .from(tables.members)
    .where(eq(tables.members.status, "aktiv"))
    .orderBy(asc(tables.members.lastName), asc(tables.members.firstName))
    .all();

  const total = db.select().from(tables.gardens).all().length;
  const action = quickSaveGarden.bind(null, garden.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Garten {garden.number} erfassen</h1>
        <span className="text-sm text-stone-500">{garden.number} von {total}</span>
      </div>
      <p className="text-sm text-stone-500">
        Daten eintragen und „Speichern & weiter“ – der nächste Garten öffnet sich automatisch.
        Fehlt ein Pächter in der Liste? <Link href="/admin/mitglieder/neu" className="text-green-700 hover:underline">Mitglied anlegen</Link> und danach hier fortsetzen.
      </p>
      {params.fehler === "nummer" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine ganze Nummer zwischen 1 und 9999 eingeben.</p>
      )}
      {params.fehler === "vergeben" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Diese Nummer ist schon einem anderen Garten zugeordnet.</p>
      )}

      <form action={action} className={`${card} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="number">Garten-Nr.</label>
            <input id="number" name="number" defaultValue={garden.number} required className={input} inputMode="numeric" />
          </div>
          <div>
            <label className={label} htmlFor="sizeSqm">Größe (m²)</label>
            <input id="sizeSqm" name="sizeSqm" defaultValue={garden.sizeSqm ?? ""} className={input} inputMode="decimal" autoFocus />
          </div>
          <div>
            <label className={label} htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={garden.status} className={input}>
              {Object.entries(gardenStatusLabels).map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="meterNumber">Stromzähler-Nr.</label>
          <input id="meterNumber" name="meterNumber" defaultValue={garden.meterNumber} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="memberId">Pächter (optional)</label>
            <select id="memberId" name="memberId" defaultValue={currentTenancy?.memberId ?? ""} className={input}>
              <option value="">– kein Pächter –</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="startDate">Pachtbeginn</label>
            <DateField id="startDate" name="startDate" defaultValue={currentTenancy?.startDate ?? today()} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="note">Bemerkung</label>
          <textarea id="note" name="note" rows={2} defaultValue={garden.note} className={input} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimary}>Speichern & weiter →</button>
          <Link href={`/admin/gaerten/${garden.id}`} className={btn}>Zur vollständigen Akte</Link>
          {garden.number > 1 && (
            <Link href={`/admin/gaerten/erfassen?nr=${garden.number - 1}`} className="text-sm text-stone-500 hover:underline">
              ← Vorheriger
            </Link>
          )}
          <Link href={`/admin/gaerten/erfassen?nr=${garden.number + 1}`} className="text-sm text-stone-500 hover:underline">
            Überspringen →
          </Link>
        </div>
      </form>
    </div>
  );
}
