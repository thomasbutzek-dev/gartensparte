import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { btnPrimary, card, input, tableClass, td, th } from "@/lib/ui";

export default async function MitgliederPage({ searchParams }: PageProps<"/admin/mitglieder">) {
  await requireUser();
  const params = await searchParams;
  const search = typeof params.suche === "string" ? params.suche.toLowerCase() : "";
  const showLeft = params.ausgeschieden === "1";

  const members = db.select().from(tables.members).orderBy(asc(tables.members.lastName), asc(tables.members.firstName)).all();
  const activeTenancies = db.select().from(tables.tenancies).where(isNull(tables.tenancies.endDate)).all();
  const gardens = db.select().from(tables.gardens).all();
  const gardenByMember = new Map<number, number[]>();
  for (const tenancy of activeTenancies) {
    const number = gardens.find((g) => g.id === tenancy.gardenId)?.number;
    if (number) gardenByMember.set(tenancy.memberId, [...(gardenByMember.get(tenancy.memberId) ?? []), number]);
  }

  const filtered = members
    .filter((m) => (showLeft ? true : m.status === "aktiv"))
    .filter((m) => !search || `${m.firstName} ${m.lastName} ${m.city}`.toLowerCase().includes(search));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mitglieder ({filtered.length})</h1>
        <Link href="/admin/mitglieder/neu" className={btnPrimary}>Mitglied anlegen</Link>
      </div>
      <form className="flex flex-wrap items-center gap-3">
        <input name="suche" placeholder="Suchen…" defaultValue={search} className={`${input} max-w-xs`} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ausgeschieden" value="1" defaultChecked={showLeft} />
          Ausgeschiedene anzeigen
        </label>
        <button className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">Filtern</button>
      </form>
      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Garten</th>
              <th className={th}>Kontakt</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className={td}>
                  <Link href={`/admin/mitglieder/${m.id}`} className="font-medium text-green-800 hover:underline">
                    {m.lastName}, {m.firstName}
                  </Link>
                </td>
                <td className={td}>{(gardenByMember.get(m.id) ?? []).map((n) => `Nr. ${n}`).join(", ") || "–"}</td>
                <td className={td}>
                  {m.phone && <div>{m.phone}</div>}
                  {m.email && <div className="text-stone-500">{m.email}</div>}
                </td>
                <td className={td}>{m.status === "aktiv" ? "aktiv" : `ausgeschieden (${m.leftAt ?? ""})`}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className={td} colSpan={4}>Keine Mitglieder gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
