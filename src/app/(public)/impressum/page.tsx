export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/public-cache";
import RichText from "@/components/RichText";
import SiteContainer from "@/components/SiteContainer";

export const metadata: Metadata = { title: "Impressum" };

export default async function ImpressumPage() {
  const settings = await getPublicSettings();
  return (
    <SiteContainer narrow className="space-y-4 py-10">
      <h1 className="text-2xl font-bold">Impressum</h1>
      <RichText html={settings.impressumText} className="leading-relaxed" />
    </SiteContainer>
  );
}
