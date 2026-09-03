export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  const settings = getSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Impressum</h1>
      <p className="whitespace-pre-line leading-relaxed">{settings.impressumText}</p>
    </div>
  );
}
