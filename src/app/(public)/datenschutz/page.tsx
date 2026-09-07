export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import SiteContainer from "@/components/SiteContainer";

export const metadata: Metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  const settings = getSettings();
  return (
    <SiteContainer narrow className="space-y-4 py-10">
      <h1 className="text-2xl font-bold">Datenschutz</h1>
      <p className="whitespace-pre-line leading-relaxed">{settings.datenschutzText}</p>
    </SiteContainer>
  );
}
