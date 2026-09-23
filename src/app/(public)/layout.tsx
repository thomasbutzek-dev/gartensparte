export const dynamic = "force-dynamic";

import Link from "next/link";
import { addressLines, showFreeGardenCount } from "@/lib/site";
import { getPublicGardenCounts, getPublicSettings } from "@/lib/public-cache";
import { versionedAssetUrl } from "@/lib/media";
import { moduleEnabled } from "@/lib/modules";
import { publicHeader, publicNavHover } from "@/lib/ui";
import SiteContainer from "@/components/SiteContainer";

const navItems = [
  { href: "/", label: "Start" },
  { href: "/termine", label: "Termine" },
  { href: "/news", label: "News" },
  { href: "/freie-gaerten", label: "Freie Gärten" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  const address = addressLines(settings);
  const occupancy = await getPublicGardenCounts();
  const showFreeBadge = showFreeGardenCount(occupancy);
  const moreLinks = [
    { href: "/dokumente", label: "Dokumente" },
    { href: "/vorstand", label: "Vorstand" },
    moduleEnabled("schaukasten") ? { href: "/schaukasten", label: "Schaukasten" } : null,
    moduleEnabled("newsletter") ? { href: "/newsletter", label: "Newsletter" } : null,
    moduleEnabled("wetter") ? { href: "/wetter", label: "Wetter" } : null,
    moduleEnabled("verband") ? { href: "/verband", label: "Verband" } : null,
  ].filter((item) => item !== null);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className={publicHeader}>
        <SiteContainer className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-3">
            {settings.logoFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={versionedAssetUrl("/api/logo", settings.logoFile)}
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
            <details className="relative">
              <summary className={`${publicNavHover} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                Mehr
              </summary>
              <div className="absolute right-0 z-40 mt-1 min-w-44 rounded-md border border-stone-200 bg-white py-1 text-sm text-stone-800 shadow-lg">
                {moreLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="block px-3 py-2 hover:bg-stone-100">
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
        </SiteContainer>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 bg-white">
        <SiteContainer className="flex flex-col gap-6 py-8 text-sm text-stone-600 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold text-stone-800">{settings.vereinName}</p>
            {address.slice(1).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {settings.vereinTelefon || settings.vereinEmail ? (
            <div>
              {settings.vereinTelefon ? <p>Telefon: {settings.vereinTelefon}</p> : null}
              {settings.vereinEmail ? <p>E-Mail: {settings.vereinEmail}</p> : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-1 md:items-end">
            <Link href="/impressum" className="hover:underline">Impressum</Link>
            <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
            <Link href="/login" className="hover:underline">Vorstand-Login</Link>
          </div>
        </SiteContainer>
        <p className="border-t border-stone-200 py-4 text-center text-sm text-stone-400">
          © {new Date().getFullYear()} {settings.vereinName}
        </p>
      </footer>
    </div>
  );
}
