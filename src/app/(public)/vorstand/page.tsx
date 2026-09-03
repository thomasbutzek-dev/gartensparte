export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { card } from "@/lib/ui";

export const metadata: Metadata = { title: "Vorstand & Ansprechpartner" };

export default function VorstandPage() {
  const settings = getSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Vorstand & Ansprechpartner</h1>
      <div className={card}>
        <p className="whitespace-pre-line leading-relaxed">{settings.ansprechpartnerText}</p>
      </div>
      <p className="text-sm text-stone-500">
        Sie erreichen uns am einfachsten Ã¼ber das <Link href="/kontakt" className="text-green-700 hover:underline">Kontaktformular</Link>.
      </p>
    </div>
  );
}
