import Link from "next/link";
import { asc, isNull, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { badge, btn, btnPrimary, card, gardenStatusColors, gardenStatusLabels, input, label, tableClass, td, th } from "@/lib/ui";
import { gardenCountsFrom } from "@/lib/site";
import { createGarden, setGardenCount } from "./actions";

export default async function GaertenPage({ searchParams }: PageProps<"/admin/gaerten">) {
  await requireUser();
  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const search = typeof params.suche === "string" ? params.suche.toLowerCase() : "";

  const gardens = db.select().from(tables.gardens).orderBy(asc(tables.gardens.number)).all();
  const tenancies = db
    .select({
      gardenId: tables.tenancies.gardenId,
      memberId: tables.members.id,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
    })
    .from(tables.tenancies)
    .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
    .where(isNull(tables.tenancies.endDate))
    .all();
  const tenantByGarden = new Map(tenancies.map((t) => [t.gardenId, t]));

  const filtered = gardens
    .filter((g) => !statusFilter || g.status === statusFilter)
    .filter((g) => {
      if (!search) return true;
      const tenant = tenantByGarden.get(g.id);
      return (
        String(g.number).includes(search) ||
        (tenant && `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(search))
      );
    });

  const occupancy = gardenCountsFrom(gardens);
  const highestNumber = gardens.reduce((max, garden) => Math.max(max, garden.number), 0);
  const created = Number(params.angelegt ?? 0);
  const removed = Number(params.entfernt ?? 0);
  const markedUnused = Number(params.ausgeblendet ?? 0);
  const kept = Number(params.behalten ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Gärten ({filtered.length})</h1>
        <div className="flex gap-2">
          <Link href="/admin/gaerten/erfassen" className={btn}>Nacheinander erfassen</Link>
          <Link href="/admin/karte" className={btnPrimary}>Zum Lageplan</Link>
        </div>
      </div>
      {params.ok === "angelegt" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Garten angelegt.</p>}
      {params.ok === "geloescht" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Nummer gelöscht.</p>}
      {params.ok === "anzahl" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Anzahl übernommen.
          {created > 0 ? ` ${created} ${created === 1 ? "Nummer angelegt" : "Nummern angelegt"}.` : ""}
          {removed > 0 ? ` ${removed} leere ${removed === 1 ? "Nummer entfernt" : "Nummern entfernt"}.` : ""}
          {markedUnused > 0 ? ` ${markedUnused} auf „Nicht vergeben“ gesetzt.` : ""}
          {kept > 0 ? ` ${kept} ${kept === 1 ? "Nummer" : "Nummern"} mit laufender Pacht blieben stehen.` : ""}
        </p>
      )}
      {params.fehler === "nummer" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine ganze Nummer zwischen 1 und 9999 eingeben.</p>
      )}
      {params.fehler === "anzahl" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine ganze Zahl zwischen 1 und 9999 eingeben.</p>
      )}
      {params.fehler === "vergeben" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Diese Nummer gibt es schon.</p>
      )}
      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Anzahl der Gärten</h2>
        <p className="text-sm text-stone-500">
          {occupancy.total === 0
            ? "Hier die Zahl der Gärten eintragen. Es werden die Nummern 1 bis zu dieser Zahl angelegt."
            : `Aktuell ${occupancy.total} ${occupancy.total === 1 ? "Garten" : "Gärten"}${highestNumber ? `, höchste Nummer ${highestNumber}` : ""}. Fehlende Nummern bis zur angegebenen Zahl werden angelegt. Höhere Nummern ohne Pächter verschwinden, wenn die Akte leer ist. Akten mit Einträgen bleiben als „Nicht vergeben“ stehen.`}
        </p>
        <form action={setGardenCount} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={label} htmlFor="gardenCount">Gärten 1 bis</label>
            <input
              id="gardenCount"
              name="count"
              inputMode="numeric"
              required
              defaultValue={highestNumber || undefined}
              className={`${input} w-32`}
              placeholder="z.B. 80"
            />
          </div>
          <button className={btnPrimary}>{gardens.length === 0 ? "Anlegen" : "Übernehmen"}</button>
        </form>
      </section>
      <p className="text-sm text-stone-500">
        Nummern, die es historisch nie gab, in der Akte auf „Nicht vergeben“ setzen – dann zählen sie nicht als frei.
        Fehlt eine einzelne Nummer, hier anlegen.
      </p>
      <form action={createGarden} className="flex flex-wrap items-end gap-3">
        <div>
          <label className={label} htmlFor="newNumber">Eine Nummer anlegen</label>
          <input id="newNumber" name="number" inputMode="numeric" required className={`${input} w-32`} placeholder="z.B. 107" />
        </div>
        <button className={btn}>Anlegen</button>
      </form>
      <form className="flex flex-wrap items-center gap-3">
        <input
          name="suche"
          placeholder="Nummer oder Pächter…"
          defaultValue={search}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={statusFilter} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">
          <option value="">Alle Status</option>
          {Object.entries(gardenStatusLabels).map(([value, text]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </select>
        <button className={btn}>Filtern</button>
      </form>
      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Nr.</th>
              <th className={th}>Größe</th>
              <th className={th}>Status</th>
              <th className={th}>Pächter</th>
              <th className={th}>Zähler-Nr.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => {
              const tenant = tenantByGarden.get(g.id);
              return (
                <tr key={g.id}>
                  <td className={td}>
                    <Link href={`/admin/gaerten/${g.id}`} className="font-medium text-green-800 hover:underline">
                      Garten {g.number}
                    </Link>
                  </td>
                  <td className={td}>{g.sizeSqm ? `${g.sizeSqm} m²` : "–"}</td>
                  <td className={td}>
                    <span className={`${badge} ${gardenStatusColors[g.status]}`}>{gardenStatusLabels[g.status]}</span>
                  </td>
                  <td className={td}>
                    {tenant ? (
                      <Link href={`/admin/mitglieder/${tenant.memberId}`} className="text-green-800 hover:underline">
                        {tenant.lastName}, {tenant.firstName}
                      </Link>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className={td}>{g.meterNumber || "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
