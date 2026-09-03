import Link from "next/link";
import { asc, isNull, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { badge, btn, btnPrimary, card, gardenStatusColors, gardenStatusLabels, tableClass, td, th } from "@/lib/ui";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Gärten ({filtered.length})</h1>
        <div className="flex gap-2">
          <Link href="/admin/gaerten/erfassen" className={btn}>Schnellerfassung</Link>
          <Link href="/admin/karte" className={btnPrimary}>Zur Karte</Link>
        </div>
      </div>
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
