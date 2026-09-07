import { db, tables } from "@/db";
import { getSettings, saveSettings } from "@/lib/settings";

export const defaultGardenDocCategories = [
  { value: "pachtvertrag", label: "Pachtvertrag" },
  { value: "strom", label: "Stromabrechnung" },
  { value: "foto", label: "Foto" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export const defaultPublicDocCategories = [
  { value: "satzung", label: "Satzung" },
  { value: "gartenordnung", label: "Gartenordnung" },
  { value: "formular", label: "Formular" },
  { value: "protokoll", label: "Protokoll" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

function uniqueExtras(known: readonly { value: string; label: string }[], extras: string[]): { value: string; label: string }[] {
  const seen = new Set(known.flatMap((item) => [item.value, item.label]));
  const result: { value: string; label: string }[] = [];
  for (const raw of extras) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push({ value, label: value });
  }
  return result;
}

export function gardenCategoryOptions() {
  const settings = getSettings();
  const used = db.select({ category: tables.gardenDocuments.category }).from(tables.gardenDocuments).all().map((row) => row.category);
  return [...defaultGardenDocCategories, ...uniqueExtras(defaultGardenDocCategories, [...settings.gardenDocCategories, ...used])];
}

export function publicCategoryOptions() {
  const settings = getSettings();
  const used = db.select({ category: tables.documents.category }).from(tables.documents).all().map((row) => row.category);
  return [...defaultPublicDocCategories, ...uniqueExtras(defaultPublicDocCategories, [...settings.publicDocCategories, ...used])];
}

export function gardenCategoryLabel(value: string): string {
  return defaultGardenDocCategories.find((item) => item.value === value)?.label ?? value;
}

export function publicCategoryLabel(value: string): string {
  return defaultPublicDocCategories.find((item) => item.value === value)?.label ?? value;
}

export function publicCategoryGroup(value: string): string {
  if (value === "satzung" || value === "gartenordnung") return "Satzung & Ordnungen";
  if (value === "formular") return "Formulare";
  if (value === "protokoll") return "Protokolle";
  if (value === "sonstiges") return "Weitere Dokumente";
  return publicCategoryLabel(value);
}

export function categoryFromForm(formData: FormData, fallback = "sonstiges"): string {
  const created = String(formData.get("newCategory") ?? "").trim().slice(0, 50);
  if (created) return created;
  return String(formData.get("category") || fallback).trim().slice(0, 50) || fallback;
}

export function rememberGardenCategory(value: string) {
  const settings = getSettings();
  const known = new Set([
    ...defaultGardenDocCategories.map((item) => item.value),
    ...defaultGardenDocCategories.map((item) => item.label),
    ...settings.gardenDocCategories,
  ]);
  if (!value || known.has(value)) return;
  saveSettings({ ...settings, gardenDocCategories: [...settings.gardenDocCategories, value] });
}

export function rememberPublicCategory(value: string) {
  const settings = getSettings();
  const known = new Set([
    ...defaultPublicDocCategories.map((item) => item.value),
    ...defaultPublicDocCategories.map((item) => item.label),
    ...settings.publicDocCategories,
  ]);
  if (!value || known.has(value)) return;
  saveSettings({ ...settings, publicDocCategories: [...settings.publicDocCategories, value] });
}
