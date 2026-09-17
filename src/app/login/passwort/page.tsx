import type { Metadata } from "next";
import { btnPrimary, card, input, label } from "@/lib/ui";
import { requireSession } from "@/lib/auth";
import { changeOwnPassword, logoutAction } from "../actions";

export const metadata: Metadata = { title: "Passwort festlegen" };

export default async function ChangePasswordPage({ searchParams }: PageProps<"/login/passwort">) {
  await requireSession();
  const params = await searchParams;
  const fehler = typeof params.fehler === "string" ? params.fehler : "";
  const messages: Record<string, string> = {
    aktuell: "Das bisherige Passwort stimmt nicht.",
    laenge: "Das neue Passwort braucht mindestens 8 Zeichen.",
    confirm: "Die Wiederholung stimmt nicht mit dem neuen Passwort überein.",
    gleich: "Bitte ein anderes Passwort als bisher wählen.",
    start: "Bitte nicht das Startpasswort wiederverwenden.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Neues Passwort</h1>
          <p className="mt-1 text-sm text-stone-500">
            Das Startpasswort gilt nur für die erste Anmeldung. Legen Sie hier Ihr eigenes fest.
          </p>
        </div>
        {fehler && messages[fehler] && (
          <p className="rounded-md bg-red-100 px-4 py-3 text-sm text-red-800">{messages[fehler]}</p>
        )}
        <form action={changeOwnPassword} className={`${card} space-y-4`}>
          <div>
            <label className={label} htmlFor="current">Bisheriges Passwort</label>
            <input id="current" name="current" type="password" required className={input} autoComplete="current-password" autoFocus />
          </div>
          <div>
            <label className={label} htmlFor="password">Neues Passwort (min. 8)</label>
            <input id="password" name="password" type="password" required minLength={8} className={input} autoComplete="new-password" />
          </div>
          <div>
            <label className={label} htmlFor="confirm">Neues Passwort wiederholen</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} className={input} autoComplete="new-password" />
          </div>
          <button className={`${btnPrimary} w-full justify-center`}>Speichern und weiter</button>
        </form>
        <form action={logoutAction} className="text-center">
          <button className="text-sm text-stone-500 hover:underline">Abmelden</button>
        </form>
      </div>
    </div>
  );
}
