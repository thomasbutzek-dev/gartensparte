// Client-sichere Formatierungshelfer (kein DB-Import!)

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** TT.MM.JJJJ oder YYYY-MM-DD → YYYY-MM-DD */
export function parseDateInput(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const german = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (german) {
    const day = Number(german[1]);
    const month = Number(german[2]);
    const year = Number(german[3]);
    if (!isValidYmd(year, month, day)) return null;
    return toIsoDate(year, month, day);
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isValidYmd(year, month, day)) return null;
    return toIsoDate(year, month, day);
  }
  return null;
}

/** TT.MM.JJJJ HH:MM oder ISO → YYYY-MM-DDTHH:mm */
export function parseDateTimeInput(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const german = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?$/);
  if (german) {
    const date = parseDateInput(`${german[1]}.${german[2]}.${german[3]}`);
    if (!date) return null;
    if (german[4] === undefined) return `${date}T00:00`;
    const hour = Number(german[4]);
    const minute = Number(german[5]);
    if (hour > 23 || minute > 59) return null;
    return `${date}T${pad(hour)}:${pad(minute)}`;
  }
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (iso) {
    const date = parseDateInput(iso[1]);
    if (!date) return null;
    return `${date}T${iso[2]}:${iso[3]}`;
  }
  const dateOnly = parseDateInput(trimmed);
  return dateOnly ? `${dateOnly}T00:00` : null;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}.${dateOnly[2]}.${dateOnly[1]}`;
  const localStamp = iso.match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}/);
  if (localStamp && !iso.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    return `${localStamp[3]}.${localStamp[2]}.${localStamp[1]}`;
  }
  const date = new Date(iso);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  const parsed = parseDateInput(iso);
  return parsed ? formatDate(parsed) : iso;
}

export function formatDateInput(iso: string | null | undefined): string {
  const formatted = formatDate(iso);
  return formatted === "–" ? "" : formatted;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const local = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (local && !iso.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    return `${local[3]}.${local[2]}.${local[1]}, ${local[4]}:${local[5]} Uhr`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatDate(iso);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDate(iso);
  const hasTime = iso.includes("T") && !iso.endsWith("T00:00");
  return hasTime
    ? date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " Uhr"
    : formatDate(iso);
}

export function formatDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = parseDateTimeInput(iso);
  if (!parsed) return "";
  const [date, time] = parsed.split("T");
  return `${formatDateInput(date)} ${time}`;
}

export function euro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function today(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function nowIso(): string {
  return new Date().toISOString();
}
