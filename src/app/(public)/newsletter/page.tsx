import type { Metadata } from "next";
import Link from "next/link";
import { requireModule } from "@/lib/modules";
import { newsletterHeading, newsletterNote } from "@/lib/newsletter-copy";
import { btnPrimary, card, input, label } from "@/lib/ui";
import SiteContainer from "@/components/SiteContainer";
import SpamGuard from "@/components/SpamGuard";
import TurnstileField from "@/components/TurnstileField";
import { subscribeNewsletter, unsubscribeNewsletter } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: newsletterHeading() };
}

export default async function NewsletterPage({ searchParams }: PageProps<"/newsletter">) {
  requireModule("newsletter");
  const params = await searchParams;
  const heading = newsletterHeading();
  const note = newsletterNote();

  return (
    <SiteContainer narrow className="space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="mt-2 whitespace-pre-line text-stone-600">{note}</p>
        <p className="mt-2 text-stone-600">
          Mehr dazu im <Link href="/datenschutz" className="text-green-700 hover:underline">Datenschutz</Link>.
        </p>
      </div>
      {params.ok === "an" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Die Adresse ist notiert.</p>
      )}
      {params.ok === "ab" && (
        <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Die Adresse ist ausgetragen, falls sie in der Liste stand.</p>
      )}
      {params.fehler === "warte" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Zu viele Versuche. Bitte ein paar Minuten warten.</p>
      )}
      {params.fehler === "captcha" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Die Spam-Prüfung ist fehlgeschlagen. Bitte die Seite neu laden.</p>
      )}
      {params.fehler === "1" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine gültige E-Mail-Adresse eintragen.</p>
      )}
      <form action={subscribeNewsletter} className={`${card} space-y-4`}>
        <SpamGuard />
        <div>
          <label className={label} htmlFor="email-an">E-Mail</label>
          <input id="email-an" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <TurnstileField action="newsletter" />
        <button className={btnPrimary}>Anmelden</button>
      </form>
      <form action={unsubscribeNewsletter} className={`${card} space-y-4`}>
        <h2 className="font-semibold">Abmelden</h2>
        <SpamGuard />
        <div>
          <label className={label} htmlFor="email-ab">E-Mail</label>
          <input id="email-ab" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <button className={btnPrimary}>Abmelden</button>
      </form>
    </SiteContainer>
  );
}
