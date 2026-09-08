export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import RichText from "@/components/RichText";
import SiteContainer from "@/components/SiteContainer";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  const settings = getSettings();
  return (
    <SiteContainer narrow className="space-y-4 py-10">
      <h1 className="text-2xl font-bold">Impressum</h1>
      <RichText html={settings.impressumText} className="leading-relaxed" />
    </SiteContainer>
  );
}
