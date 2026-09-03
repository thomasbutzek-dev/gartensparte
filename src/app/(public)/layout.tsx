import Link from "next/link";
import { getSettings } from "@/lib/settings";

const navItems = [
  { href: "/", label: "Start" },
  { href: "/termine", label: "Termine" },
  { href: "/news", label: "News" },
  { href: "/freie-gaerten", label: "Freie Gärten" },
  { href: "/dokumente", label: "Dokumente" },
  { href: "/vorstand", label: "Vorstand" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-green-800 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            {settings.vereinName}
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-stone-500">
          <span>
            © {new Date().getFullYear()} {settings.vereinName}
          </span>
          <span className="flex gap-4">
            <Link href="/impressum" className="hover:underline">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:underline">
              Datenschutz
            </Link>
            <Link href="/login" className="hover:underline">
              Vorstand-Login
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
