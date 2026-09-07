import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";

export const WORK_DUTY_PRESETS = [
  "Vorstand",
  "Kassenwart",
  "Schriftführer",
  "Wegbeauftragter",
  "Fachberatung",
  "Gerätewart",
] as const;

export function creditedWorkHours(logged: number, exempt: boolean, soll: number): number {
  if (exempt) return Math.max(logged, soll);
  return logged;
}

export function missingWorkHours(logged: number, exempt: boolean, soll: number): number {
  return Math.max(0, soll - creditedWorkHours(logged, exempt, soll));
}

export function listWorkDutyOptions(): string[] {
  const extras = db
    .select({ reason: tables.workExemptions.reason })
    .from(tables.workExemptions)
    .all()
    .map((row) => row.reason.trim())
    .filter((reason) => reason && !WORK_DUTY_PRESETS.includes(reason as (typeof WORK_DUTY_PRESETS)[number]));
  return [...WORK_DUTY_PRESETS, ...[...new Set(extras)].sort((a, b) => a.localeCompare(b, "de"))];
}

export function getWorkExemption(memberId: number, year: number) {
  return db
    .select()
    .from(tables.workExemptions)
    .where(and(eq(tables.workExemptions.memberId, memberId), eq(tables.workExemptions.year, year)))
    .get();
}

export function workExemptionsForYear(year: number) {
  return db.select().from(tables.workExemptions).where(eq(tables.workExemptions.year, year)).all();
}
