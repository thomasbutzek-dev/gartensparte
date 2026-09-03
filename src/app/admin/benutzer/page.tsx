import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireAdminRole } from "@/lib/auth";
import { badge, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { createUser, setUserPassword, setUserRole, toggleUserActive } from "./actions";

const roleLabels: Record<string, string> = {
  admin: "Admin (alles)",
  vorstand: "Vorstand (ohne Kasse)",
  kassenwart: "Kassenwart (mit Kasse)",
};

export default async function BenutzerPage({ searchParams }: PageProps<"/admin/benutzer">) {
  const me = await requireAdminRole();
  const params = await searchParams;
  const users = db.select().from(tables.users).orderBy(asc(tables.users.name)).all();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Benutzer</h1>
      {params.ok === "angelegt" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Benutzer angelegt.</p>}
      {params.ok === "passwort" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Passwort geändert (alle Sitzungen des Benutzers beendet).</p>}
      {params.fehler === "eingabe" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Eingaben prüfen (Passwort mind. 8 Zeichen, Benutzername nur Kleinbuchstaben/Ziffern).</p>}
      {params.fehler === "benutzername" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Benutzername ist bereits vergeben.</p>}
      {params.fehler === "passwort" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Passwort muss mindestens 8 Zeichen haben.</p>}
      {params.fehler === "selbst" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Das eigene Konto kann nicht geändert werden.</p>}
      {params.fehler === "letzteradmin" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Der letzte aktive Admin kann nicht gesperrt werden.</p>}

      <form action={createUser} className={`${card} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`}>
        <div>
          <label className={label} htmlFor="name">Name *</label>
          <input id="name" name="name" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="username">Benutzername *</label>
          <input id="username" name="username" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="password">Passwort * (min. 8)</label>
          <input id="password" name="password" type="password" required minLength={8} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="role">Rolle</label>
          <select id="role" name="role" className={input}>
            {Object.entries(roleLabels).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className={btnPrimary}>Anlegen</button>
        </div>
      </form>

      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Benutzername</th>
              <th className={th}>Rolle</th>
              <th className={th}>Status</th>
              <th className={th}>Neues Passwort</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className={td}>
                  {user.name}
                  {user.id === me.id && <span className="ml-2 text-xs text-stone-400">(Sie)</span>}
                </td>
                <td className={td}>{user.username}</td>
                <td className={td}>
                  {user.id === me.id ? (
                    roleLabels[user.role]
                  ) : (
                    <form action={setUserRole.bind(null, user.id)} className="flex items-center gap-1">
                      <select name="role" defaultValue={user.role} className="rounded border border-stone-300 px-1 py-0.5 text-xs">
                        {Object.entries(roleLabels).map(([value, text]) => (
                          <option key={value} value={value}>{text}</option>
                        ))}
                      </select>
                      <button className="text-xs text-green-700 hover:underline">OK</button>
                    </form>
                  )}
                </td>
                <td className={td}>
                  <span className={`${badge} ${user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {user.active ? "Aktiv" : "Gesperrt"}
                  </span>
                </td>
                <td className={td}>
                  <form action={setUserPassword.bind(null, user.id)} className="flex items-center gap-1">
                    <input name="password" type="password" minLength={8} placeholder="Neues Passwort" className="w-36 rounded border border-stone-300 px-2 py-1 text-xs" />
                    <button className="text-xs text-green-700 hover:underline">Setzen</button>
                  </form>
                </td>
                <td className={td}>
                  {user.id !== me.id && (
                    <form action={toggleUserActive.bind(null, user.id)}>
                      <button className="text-xs text-red-700 hover:underline">{user.active ? "Sperren" : "Entsperren"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
