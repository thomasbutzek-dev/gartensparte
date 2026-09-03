import Link from "next/link";
import { canAdminister, canManageMoney, requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const nav: { href: string; label: string }[] = [
    { href: "/admin", label: "Übersicht" },
    { href: "/admin/gaerten", label: "Gärten" },
    { href: "/admin/karte", label: "Karte" },
    { href: "/admin/mitglieder", label: "Mitglieder" },
    { href: "/admin/warteliste", label: "Warteliste" },
    ...(canManageMoney(user) ? [{ href: "/admin/zahlungen", label: "Zahlungen" }] : []),
    { href: "/admin/ablesen", label: "Strom ablesen" },
    { href: "/admin/arbeitsstunden", label: "Arbeitsstunden" },
    { href: "/admin/schriftverkehr", label: "Schriftverkehr" },
    { href: "/admin/termine", label: "Termine" },
    { href: "/admin/news", label: "News" },
    { href: "/admin/aufgaben", label: "Aufgaben" },
    { href: "/admin/dokumente", label: "Dokumente" },
    { href: "/admin/posteingang", label: "Posteingang" },
    ...(canAdminister(user)
      ? [
          { href: "/admin/benutzer", label: "Benutzer" },
          { href: "/admin/einstellungen", label: "Einstellungen" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-stone-200 bg-green-900 text-white md:min-h-screen md:w-56 md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/admin" className="font-bold">Verwaltung</Link>
          <p className="text-xs text-green-200 md:mt-1">
            {user.name} · {user.role}
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 text-sm md:flex-col md:pb-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-green-800"
            >
              {item.label}
            </Link>
          ))}
          <form action={logoutAction} className="md:mt-4">
            <button className="w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-green-200 hover:bg-green-800">
              Abmelden
            </button>
          </form>
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
