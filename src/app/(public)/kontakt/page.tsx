export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { hasMapPoint, mapsSearchUrl, officeHoursLabel, osmEmbedUrl } from "@/lib/settings";
import { getPublicSettings } from "@/lib/public-cache";
import { btnPrimary, card, input, label } from "@/lib/ui";
import PublicMap from "@/components/PublicMap";
import SiteContainer from "@/components/SiteContainer";
import SpamGuard from "@/components/SpamGuard";
import TurnstileField from "@/components/TurnstileField";
import { submitInquiry } from "../actions";

export const metadata: Metadata = { title: "Kontakt" };

export default async function KontaktPage({ searchParams }: PageProps<"/kontakt">) {
  const params = await searchParams;
  const settings = await getPublicSettings();

  return (
    <SiteContainer narrow className="space-y-6 py-10">
      <h1 className="text-2xl font-bold">Kontakt</h1>
      {hasMapPoint(settings) && mapsSearchUrl(settings) && osmEmbedUrl(settings) ? (
        <PublicMap embedUrl={osmEmbedUrl(settings)!} pageUrl={mapsSearchUrl(settings)!} />
      ) : null}
      {settings.vereinTelefon || settings.vereinEmail || officeHoursLabel(settings) ? (
        <p className="text-stone-600">
          {settings.vereinTelefon && <>Telefon: {settings.vereinTelefon}. </>}
          {settings.vereinEmail && <>E-Mail: {settings.vereinEmail}. </>}
          {officeHoursLabel(settings) ? <span className="mt-2 block">{officeHoursLabel(settings)}</span> : null}
        </p>
      ) : null}
      {params.ok && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Vielen Dank! Ihre Nachricht ist eingegangen – wir melden uns.
        </p>
      )}
      {params.fehler === "warte" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Zu viele Nachrichten in kurzer Zeit. Bitte warten Sie ein paar Minuten.
        </p>
      )}
      {params.fehler === "captcha" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Die Spam-Prüfung ist fehlgeschlagen. Bitte die Seite neu laden und noch einmal senden.
        </p>
      )}
      {params.fehler && params.fehler !== "warte" && params.fehler !== "captcha" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Bitte füllen Sie Name und Nachricht aus.
        </p>
      )}
      <form action={submitInquiry} className={`${card} space-y-4`}>
        <SpamGuard />
        <div>
          <label className={label} htmlFor="name">Name *</label>
          <input id="name" name="name" required className={input} autoComplete="name" />
        </div>
        <div>
          <label className={label} htmlFor="email">E-Mail (für die Antwort)</label>
          <input id="email" name="email" type="email" className={input} autoComplete="email" />
        </div>
        <div>
          <label className={label} htmlFor="subject">Betreff</label>
          <input id="subject" name="subject" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="message">Nachricht *</label>
          <textarea id="message" name="message" rows={6} required className={input} />
        </div>
        <TurnstileField action="kontakt" />
        <button className={btnPrimary}>Nachricht senden</button>
      </form>
    </SiteContainer>
  );
}
