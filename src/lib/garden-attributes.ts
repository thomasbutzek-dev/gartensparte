import { db, tables } from "@/db";
import { getSettings, saveSettings } from "@/lib/settings";

export const defaultGardenAttributes = [
  { value: "verwahrlost", label: "Verwahrlost" },
  { value: "kein-anbau", label: "Kein Anbau" },
  { value: "keine-laube", label: "Keine Laube" },
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

export function parseGardenAttributes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((item) => String(item ?? "").trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

export function gardenAttributeLabel(value: string): string {
  return defaultGardenAttributes.find((item) => item.value === value)?.label ?? value;
}

export function gardenAttributeOptions() {
  const settings = getSettings();
  const used = db
    .select({ attributes: tables.gardens.attributes })
    .from(tables.gardens)
    .all()
    .flatMap((row) => parseGardenAttributes(row.attributes));
  return [...defaultGardenAttributes, ...uniqueExtras(defaultGardenAttributes, [...settings.gardenAttributes, ...used])];
}

export function rememberGardenAttribute(value: string): "ok" | "leer" | "bekannt" {
  const trimmed = value.trim().slice(0, 50);
  if (!trimmed) return "leer";
  const settings = getSettings();
  const known = new Set([
    ...defaultGardenAttributes.map((item) => item.value),
    ...defaultGardenAttributes.map((item) => item.label),
    ...settings.gardenAttributes,
  ]);
  if (known.has(trimmed)) return "bekannt";
  saveSettings({ ...settings, gardenAttributes: [...settings.gardenAttributes, trimmed] });
  return "ok";
}

export function collectGardenAttributes(formData: FormData): string[] {
  const selected = formData.getAll("attribute").map((item) => String(item).trim()).filter(Boolean);
  const created = String(formData.get("newAttribute") ?? "").trim().slice(0, 50);
  const values = created ? [...selected, created] : selected;
  const unique = [...new Set(values)];
  if (created) rememberGardenAttribute(created);
  return unique;
}

export function gardenHasAttribute(raw: string | null | undefined, value: string): boolean {
  return parseGardenAttributes(raw).includes(value);
}
