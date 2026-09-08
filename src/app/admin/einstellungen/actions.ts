"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth";
import { readRichText } from "@/lib/rich-text";
import { getSettings, saveSettings } from "@/lib/settings";

function text(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function euroCents(formData: FormData, key: string, fallback: number): number {
  const raw = String(formData.get(key) ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : fallback;
}

function num(formData: FormData, key: string, fallback: number): number {
  const value = Number(String(formData.get(key) ?? "").replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function updateSettings(formData: FormData) {
  await requireAdminRole();
  const current = getSettings();
  saveSettings({
    ...current,
    bankName: text(formData, "bankName"),
    iban: text(formData, "iban"),
    bic: text(formData, "bic"),
    pachtCentProQm: euroCents(formData, "pachtProQm", current.pachtCentProQm),
    mitgliedsbeitragCents: euroCents(formData, "mitgliedsbeitrag", current.mitgliedsbeitragCents),
    umlageCents: euroCents(formData, "umlage", current.umlageCents),
    umlageBezeichnung: text(formData, "umlageBezeichnung") || current.umlageBezeichnung,
    stromCentProKwh: euroCents(formData, "stromProKwh", current.stromCentProKwh),
    stromGrundgebuehrCents: euroCents(formData, "stromGrundgebuehr", current.stromGrundgebuehrCents),
    arbeitsstundenSoll: num(formData, "arbeitsstundenSoll", current.arbeitsstundenSoll),
    arbeitsstundenSatzCents: euroCents(formData, "arbeitsstundenSatz", current.arbeitsstundenSatzCents),
    zahlungszielTage: Math.round(num(formData, "zahlungszielTage", current.zahlungszielTage)),
    impressumText: readRichText(formData, "impressumText", 20000),
    datenschutzText: readRichText(formData, "datenschutzText", 20000),
  });
  revalidatePath("/", "layout");
  redirect("/admin/einstellungen?ok=1");
}
