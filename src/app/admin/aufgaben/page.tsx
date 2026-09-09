import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { DateField } from "@/components/DateField";
import SaveButton from "@/components/SaveButton";
import { formatDate, today } from "@/lib/format";
import { badge, card, input, label, tableClass, td, th } from "@/lib/ui";
import { createTask, deleteTask, setTaskStatus } from "./actions";

const statusLabels: Record<string, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
};
const statusColors: Record<string, string> = {
  offen: "bg-amber-100 text-amber-800",
  in_arbeit: "bg-blue-100 text-blue-800",
  erledigt: "bg-green-100 text-green-800",
};

export default async function AufgabenPage({ searchParams }: PageProps<"/admin/aufgaben">) {
  await requireUser();
  const params = await searchParams;
  const showDone = params.erledigt === "1";
  const tasks = db
    .select()
    .from(tables.tasks)
    .orderBy(desc(tables.tasks.createdAt))
    .all()
    .filter((t) => showDone || t.status !== "erledigt");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aufgaben</h1>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Aufgabe angelegt.</p>}

      <form action={createTask} className={`${card} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`}>
        <div className="lg:col-span-2">
          <label className={label} htmlFor="title">Aufgabe *</label>
          <input id="title" name="title" required className={input} placeholder="z.B. Wasserleitung prüfen" />
        </div>
        <div>
          <label className={label} htmlFor="assignee">Zuständig</label>
          <input id="assignee" name="assignee" className={input} placeholder="Name oder Gruppe" />
        </div>
        <div>
          <label className={label} htmlFor="dueDate">Fällig</label>
          <DateField id="dueDate" name="dueDate" />
        </div>
        <div className="flex items-end">
          <SaveButton>Anlegen</SaveButton>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <label className={label} htmlFor="description">Details</label>
          <textarea id="description" name="description" rows={2} className={input} />
        </div>
      </form>

      <p className="text-sm">
        <a href={showDone ? "/admin/aufgaben" : "/admin/aufgaben?erledigt=1"} className="text-green-700 hover:underline">
          {showDone ? "Erledigte ausblenden" : "Erledigte anzeigen"}
        </a>
      </p>

      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Aufgabe</th>
              <th className={th}>Zuständig</th>
              <th className={th}>Fällig</th>
              <th className={th}>Status</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const overdue = task.status !== "erledigt" && task.dueDate !== null && task.dueDate < today();
              return (
                <tr key={task.id} className={overdue ? "bg-red-50" : undefined}>
                  <td className={td}>
                    <span className="font-medium">{task.title}</span>
                    {task.description && <div className="text-xs text-stone-500">{task.description}</div>}
                  </td>
                  <td className={td}>{task.assignee || "–"}</td>
                  <td className={td}>{formatDate(task.dueDate)}</td>
                  <td className={td}>
                    <span className={`${badge} ${statusColors[task.status]}`}>{statusLabels[task.status]}</span>
                  </td>
                  <td className={`${td} space-x-3 whitespace-nowrap`}>
                    {task.status !== "erledigt" && (
                      <form action={setTaskStatus.bind(null, task.id)} className="inline">
                        <input type="hidden" name="status" value={task.status === "offen" ? "in_arbeit" : "erledigt"} />
                        <button className="text-xs text-green-700 hover:underline">
                          {task.status === "offen" ? "In Arbeit" : "Erledigt"}
                        </button>
                      </form>
                    )}
                    {task.status === "erledigt" && (
                      <form action={setTaskStatus.bind(null, task.id)} className="inline">
                        <input type="hidden" name="status" value="offen" />
                        <button className="text-xs text-stone-500 hover:underline">Wieder öffnen</button>
                      </form>
                    )}
                    <form action={deleteTask.bind(null, task.id)} className="inline">
                      <button className="text-xs text-red-700 hover:underline">Löschen</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>Keine Aufgaben.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
