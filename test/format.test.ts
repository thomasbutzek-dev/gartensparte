import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateInput,
  formatDateTime,
  formatDateTimeInput,
  parseDateInput,
  parseDateTimeInput,
} from "@/lib/format";

describe("Deutsches Datum", () => {
  it("liest TT.MM.JJJJ und ISO", () => {
    expect(parseDateInput("1.1.2025")).toBe("2025-01-01");
    expect(parseDateInput("01.01.2025")).toBe("2025-01-01");
    expect(parseDateInput("2025-01-01")).toBe("2025-01-01");
    expect(parseDateInput("31.02.2025")).toBeNull();
    expect(parseDateInput("")).toBeNull();
  });

  it("schreibt TT.MM.JJJJ ohne Zeitzonenrutschen", () => {
    expect(formatDate("2025-01-01")).toBe("01.01.2025");
    expect(formatDateInput("2025-11-30")).toBe("30.11.2025");
    expect(formatDate(null)).toBe("–");
  });

  it("liest Datum mit Uhrzeit", () => {
    expect(parseDateTimeInput("04.09.2026 18:00")).toBe("2026-09-04T18:00");
    expect(parseDateTimeInput("04.09.2026, 9:05")).toBe("2026-09-04T09:05");
    expect(parseDateTimeInput("2026-09-04T18:00")).toBe("2026-09-04T18:00");
  });

  it("zeigt lokale Termine mit Uhrzeit", () => {
    expect(formatDateTime("2026-09-04T18:00")).toBe("04.09.2026, 18:00 Uhr");
    expect(formatDateTimeInput("2026-09-04T18:00")).toBe("04.09.2026 18:00");
  });
});
