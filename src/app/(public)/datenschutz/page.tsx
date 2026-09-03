export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  const settings = getSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Datenschutz</h1>
      <p className="whitespace-pre-line leading-relaxed">{settings.datenschutzText}</p>
    </div>
  );
}
