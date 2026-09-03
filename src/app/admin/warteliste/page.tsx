import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { badge, card, tableClass, td, th } from "@/lib/ui";
import { deleteApplicant, saveApplicantNote, setApplicantStatus } from "./actions";

const statusLabels: Record<string, string> = {
  offen: "Offen",
  kontaktiert: "Kontaktiert",
  vergeben: "Garten vergeben",
  zurueckgezogen: "Zurückgezogen",
};
const statusColors: Record<string, string> = {
  offen: "bg-amber-100 text-amber-800",
  kontaktiert: "bg-blue-100 text-blue-800",
  vergeben: "bg-green-100 text-green-800",
  zurueckgezogen: "bg-stone-200 text-stone-600",
};

export default async function WartelistePage({ searchParams }: PageProps<"/admin/warteliste">) {
  await requireUser();
  const params = await searchParams;
  const showAll = params.alle === "1";
  const applicants = db
    .select()
    .from(tables.applicants)
    .orderBy(asc(tables.applicants.createdAt))
    .all()
    .filter((a) => showAll || a.status === "offen" || a.status === "kontaktiert");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Warteliste ({applicants.length})</h1>
      <p className="text-sm text-stone-500">
        Anfragen aus dem Formular „Freie Gärten“, sortiert nach Eingang (älteste zuerst).{" "}
        <a href={showAll ? "/admin/warteliste" : "/admin/warteliste?alle=1"} className="text-green-700 hover:underline">
          {showAll ? "Nur aktive anzeigen" : "Auch erledigte anzeigen"}
        </a>
      </p>
      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>#</th>
              <th className={th}>Eingang</th>
              <th className={th}>Name & Kontakt</th>
              <th className={th}>Wunsch / Nachricht</th>
              <th className={th}>Status</th>
              <th className={th}>Notiz</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a, index) => (
              <tr key={a.id}>
                <td className={td}>{index + 1}</td>
                <td className={td}>{formatDate(a.createdAt)}</td>
                <td className={td}>
                  <div className="font-medium">{a.name}</div>
                  {a.email && <div className="text-xs">{a.email}</div>}
                  {a.phone && <div className="text-xs">{a.phone}</div>}
                </td>
                <td className={td}>
                  {a.desiredSize && <div className="text-xs">Größe: {a.desiredSize}</div>}
                  {a.message && <div className="max-w-60 text-xs text-stone-500">{a.message}</div>}
                </td>
                <td className={td}>
                  <span className={`${badge} ${statusColors[a.status]}`}>{statusLabels[a.status]}</span>
                  <form action={setApplicantStatus.bind(null, a.id)} className="mt-1">
                    <select
                      name="status"
                      defaultValue={a.status}
                      className="rounded border border-stone-300 px-1 py-0.5 text-xs"
                    >
                      {Object.entries(statusLabels).map(([value, text]) => (
                        <option key={value} value={value}>{text}</option>
                      ))}
                    </select>
                    <button className="ml-1 text-xs text-green-700 hover:underline">OK</button>
                  </form>
                </td>
                <td className={td}>
                  <form action={saveApplicantNote.bind(null, a.id)} className="flex items-center gap-1">
                    <input name="note" defaultValue={a.note} className="w-32 rounded border border-stone-300 px-2 py-1 text-xs" />
                    <button className="text-xs text-green-700 hover:underline">Sichern</button>
                  </form>
                </td>
                <td className={td}>
                  <form action={deleteApplicant.bind(null, a.id)}>
                    <button className="text-xs text-red-700 hover:underline">Löschen</button>
                  </form>
                </td>
              </tr>
            ))}
            {applicants.length === 0 && (
              <tr>
                <td className={td} colSpan={7}>Keine Anfragen.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
