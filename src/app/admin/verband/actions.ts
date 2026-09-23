"use server";

import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/auth";
import { requireModule } from "@/lib/modules";
import { safePublicUrl, setVerbandFeedUrl, setVerbandHeading } from "@/lib/verband";

export async function saveVerbandFeed(formData: FormData) {
  await requireWrite();
  requireModule("verband");
  setVerbandHeading(String(formData.get("title") ?? "").trim().slice(0, 80));
  if (formData.get("clear") === "1") {
    setVerbandFeedUrl("");
    redirect("/admin/verband?ok=1");
  }
  const raw = String(formData.get("url") ?? "").trim();
  if (!raw) {
    setVerbandFeedUrl("");
    redirect("/admin/verband?ok=1");
  }
  const url = safePublicUrl(raw);
  if (!url) redirect("/admin/verband?fehler=adresse");
  setVerbandFeedUrl(url.href);
  redirect("/admin/verband?ok=1");
}
