import Link from "next/link";
import { getSettings, officeHoursLabel } from "@/lib/settings";
import { addressLines, gardenCounts, mapsSearchUrl, showFreeGardenCount } from "@/lib/site";
import { publicHeader, publicNavHover } from "@/lib/ui";
import SiteContainer from "@/components/SiteContainer";

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
  const address = addressLines(settings);
  const mapsUrl = mapsSearchUrl(settings);
  const occupancy = gardenCounts();
  const showFreeBadge = showFreeGardenCount(occupancy);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className={publicHeader}>
        <SiteContainer className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-3">
            {settings.logoFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/logo"
                alt=""
                width={40}
                height={40}
                decoding="async"
                className="h-10 w-10 rounded-full bg-white object-contain p-0.5"
              />
            ) : null}
            <span className="text-lg font-bold leading-tight">{settings.vereinName}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={publicNavHover}
              >
                {item.label}
                {item.href === "/freie-gaerten" && showFreeBadge ? (
                  <span className="rounded-full bg-amber-300 px-1.5 text-xs font-bold leading-5 text-green-950">
                    {occupancy.free}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </SiteContainer>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 bg-white">
        <SiteContainer className="grid gap-6 py-8 text-sm text-stone-600 md:grid-cols-3">
          <div>
            <p className="font-semibold text-stone-800">{settings.vereinName}</p>
            {address.slice(1).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-green-700 hover:underline">
                Lage auf OpenStreetMap
              </a>
            ) : null}
          </div>
          <div>
            {settings.vereinTelefon ? <p>Telefon: {settings.vereinTelefon}</p> : null}
            {settings.vereinEmail ? <p>E-Mail: {settings.vereinEmail}</p> : null}
            {officeHoursLabel(settings) ? (
              <p className="mt-2 whitespace-pre-line">{officeHoursLabel(settings)}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 md:items-end">
            <Link href="/impressum" className="hover:underline">Impressum</Link>
            <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
            <Link href="/login" className="hover:underline">Vorstand-Login</Link>
            <p className="mt-3 text-stone-400">© {new Date().getFullYear()} {settings.vereinName}</p>
          </div>
        </SiteContainer>
      </footer>
    </div>
  );
}
