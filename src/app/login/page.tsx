import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { btnPrimary, card, input, label } from "@/lib/ui";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Anmeldung" };

const roleLabels = {
  admin: "Administrator",
  vorstand: "Vorstand",
  kassenwart: "Kassenwart",
  demo: "Demo",
} as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getSessionUser();
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Vorstand-Anmeldung</h1>
          <p className="mt-1 text-sm text-stone-500">Verwaltung der Gartensparte</p>
        </div>
        {user && (
          <p className="rounded-md bg-amber-100 px-4 py-3 text-sm text-amber-900">
            Gerade angemeldet als {user.name}
            {user.role === "demo" ? " (Demo, nur anschauen)" : ` (${roleLabels[user.role]})`}.
            Zum Wechseln einfach unten mit dem anderen Konto anmelden.{" "}
            <Link href="/admin" className="font-medium underline">
              Zur Verwaltung
            </Link>
          </p>
        )}
        {params.fehler === "gesperrt" && (
          <p className="rounded-md bg-red-100 px-4 py-3 text-sm text-red-800">
            Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.
          </p>
        )}
        {params.fehler === "1" && (
          <p className="rounded-md bg-red-100 px-4 py-3 text-sm text-red-800">Anmeldung nicht möglich.</p>
        )}
        <form action={loginAction} className={`${card} space-y-4`}>
          <div>
            <label className={label} htmlFor="username">Benutzername</label>
            <input id="username" name="username" required className={input} autoComplete="username" autoFocus />
          </div>
          <div>
            <label className={label} htmlFor="password">Passwort</label>
            <input id="password" name="password" type="password" required className={input} autoComplete="current-password" />
          </div>
          <button className={`${btnPrimary} w-full justify-center`}>Anmelden</button>
        </form>
        <p className="text-center text-sm text-stone-500">
          <Link href="/" className="hover:underline">← Zurück zur Website</Link>
        </p>
      </div>
    </div>
  );
}
