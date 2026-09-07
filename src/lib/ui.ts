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

export const tableClass = "w-full text-sm";
export const th = "px-3 py-2 text-left font-semibold text-stone-600 border-b border-stone-200";
export const td = "px-3 py-2 border-b border-stone-100 align-top";

export const badge = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";

export const gardenStatusColors: Record<string, string> = {
  verpachtet: "bg-green-100 text-green-800",
  frei: "bg-blue-100 text-blue-800",
  kuendigung: "bg-amber-100 text-amber-800",
  verwahrlost: "bg-red-100 text-red-800",
  entfaellt: "bg-stone-200 text-stone-600",
};

export const gardenStatusMapColors: Record<string, string> = {
  verpachtet: "#86efac",
  frei: "#93c5fd",
  kuendigung: "#fcd34d",
  verwahrlost: "#fca5a5",
  entfaellt: "#e7e5e4",
};

export const gardenStatusLabels: Record<string, string> = {
  verpachtet: "Verpachtet",
  frei: "Frei",
  kuendigung: "Kündigung",
  verwahrlost: "Verwahrlost",
  entfaellt: "Nicht vergeben",
};
