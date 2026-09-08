// Gemeinsame Tailwind-Klassen, damit Formulare/Buttons überall gleich aussehen.

export const input =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600";

export const label = "block text-sm font-medium text-stone-700 mb-1";

export const btn =
  "inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-100";

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-800";

export const btnDanger =
  "inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-800";

export const card = "rounded-lg border border-stone-200 bg-white p-4 shadow-sm";

/** Öffentliche Flächen: Sommergrün, Schrift bleibt auf dem dunkleren unteren Verlauf lesbar. */
export const publicHeader =
  "sticky top-0 z-30 border-b border-sparte-deep/25 bg-sparte text-white shadow-sm";
export const publicNavHover = "inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-sparte-hover";
export const photoWash = "bg-lime-500/10";
export const photoScrim = "bg-gradient-to-t from-sparte-deep/75 via-sparte/35 to-transparent";
export const photoText = "text-white [text-shadow:0_1px_3px_rgba(20,40,16,0.55)]";
export const photoMuted = "text-white [text-shadow:0_1px_3px_rgba(20,40,16,0.5)]";

export const tableClass = "w-full text-sm";
export const th = "px-3 py-2 text-left font-semibold text-stone-600 border-b border-stone-200";
export const td = "px-3 py-2 border-b border-stone-100 align-top";

export const badge = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";

export const gardenStatusColors: Record<string, string> = {
  verpachtet: "bg-green-100 text-green-800",
  frei: "bg-blue-100 text-blue-800",
  entfaellt: "bg-stone-200 text-stone-600",
  kuendigung: "bg-amber-100 text-amber-800",
};

export const gardenStatusMapColors: Record<string, string> = {
  verpachtet: "#86efac",
  frei: "#93c5fd",
  entfaellt: "#e7e5e4",
  kuendigung: "#fcd34d",
};

/** Reihenfolge wie im Vorstand: Verpachtet, frei, nicht vergeben, gekündigt. */
export const gardenStatusLabels: Record<string, string> = {
  verpachtet: "Verpachtet",
  frei: "Frei",
  entfaellt: "Nicht vergeben",
  kuendigung: "Gekündigt",
};

export function gardenStatusLabel(status: string): string {
  if (status === "verwahrlost") return gardenStatusLabels.frei;
  return gardenStatusLabels[status] ?? status;
}
