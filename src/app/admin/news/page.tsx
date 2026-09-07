import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { badge, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { createNews, deleteNews, toggleNewsStatus } from "./actions";

export default async function AdminNewsPage({ searchParams }: PageProps<"/admin/news">) {
  await requireUser();
  const params = await searchParams;
  const items = db.select().from(tables.news).orderBy(desc(tables.news.createdAt)).all();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">News</h1>
      <p className="text-sm text-stone-500">
        Meldungen für die Website. Termine (Versammlung, Arbeitseinsatz) stehen extra unter Termine. Ein Entwurf ist nur hier sichtbar.
      </p>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className={card}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Erstellt</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className={td}>
                    <Link href={`/admin/news/${item.id}`} className="font-medium text-green-800 hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className={td}>{formatDate(item.createdAt)}</td>
                  <td className={td}>
                    <span className={`${badge} ${item.status === "veroeffentlicht" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status === "veroeffentlicht" ? "Veröffentlicht" : "Entwurf"}
                    </span>
                  </td>
                  <td className={`${td} space-x-3 whitespace-nowrap`}>
                    <form action={toggleNewsStatus.bind(null, item.id)} className="inline">
                      <button className="text-xs text-green-700 hover:underline">
                        {item.status === "veroeffentlicht" ? "Zurückziehen" : "Veröffentlichen"}
                      </button>
                    </form>
                    <form action={deleteNews.bind(null, item.id)} className="inline">
                      <button className="text-xs text-red-700 hover:underline">Löschen</button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className={td} colSpan={4}>Noch keine News.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createNews} className={`${card} h-fit space-y-4`}>
          <h2 className="text-lg font-semibold">Neue Meldung</h2>
          <div>
            <label className={label} htmlFor="title">Titel *</label>
            <input id="title" name="title" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="body">Text *</label>
            <textarea id="body" name="body" rows={8} required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="status">Sichtbarkeit</label>
            <select id="status" name="status" defaultValue="entwurf" className={input}>
              <option value="entwurf">Entwurf (nur intern)</option>
              <option value="veroeffentlicht">Veröffentlicht (auf der Website)</option>
            </select>
          </div>
          <button className={btnPrimary}>Anlegen</button>
        </form>
      </div>
    </div>
  );
}
