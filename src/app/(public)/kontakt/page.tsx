import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { btnPrimary, card, input, label } from "@/lib/ui";
import SpamGuard from "@/components/SpamGuard";
import { submitInquiry } from "../actions";

export const metadata: Metadata = { title: "Kontakt" };

export default async function KontaktPage({ searchParams }: PageProps<"/kontakt">) {
  const params = await searchParams;
  const settings = getSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Kontakt</h1>
      {settings.vereinTelefon || settings.vereinEmail ? (
        <p className="text-stone-600">
          {settings.vereinTelefon && <>Telefon: {settings.vereinTelefon}. </>}
          {settings.vereinEmail && <>E-Mail: {settings.vereinEmail}.</>}
        </p>
      ) : null}
      {params.ok && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
          Vielen Dank! Ihre Nachricht ist eingegangen – wir melden uns.
        </p>
      )}
      {params.fehler && (
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
        <button className={btnPrimary}>Nachricht senden</button>
      </form>
    </div>
  );
}
