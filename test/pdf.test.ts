import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

process.env.DATA_DIR ??= mkdtempSync(join(tmpdir(), "gartensparte-pdf-test-"));

const { fillTemplate, renderLetterPdf, mergePdfs } = await import("@/lib/pdf");
const { defaultSettings } = await import("@/lib/settings");

describe("fillTemplate", () => {
  it("ersetzt Platzhalter", () => {
    expect(fillTemplate("Hallo {{name}}, Garten {{garten_nummer}}!", { name: "Max", garten_nummer: "12" })).toBe(
      "Hallo Max, Garten 12!",
    );
  });

  it("lässt unbekannte Platzhalter sichtbar stehen", () => {
    expect(fillTemplate("{{unbekannt}}", {})).toBe("{{unbekannt}}");
  });
});

describe("renderLetterPdf", () => {
  it("erzeugt ein gültiges PDF mit Positionstabelle", async () => {
    const bytes = await renderLetterPdf({
      settings: { ...defaultSettings, vereinName: "Testsparte e.V.", iban: "DE00 1234" },
      recipient: ["Max Mustermann", "Gartenweg 1", "12345 Teststadt"],
      date: "03.09.2026",
      subject: "Rechnung 2026-001",
      body: "Sehr geehrter Herr Mustermann,\n\nanbei die Jahresrechnung mit Umlauten: äöüß €.",
      table: {
        rows: [
          { label: "Pacht 2026 (300 m²)", amountCents: 9000 },
          { label: "Mitgliedsbeitrag", amountCents: 4000 },
        ],
        totalLabel: "Gesamtbetrag",
      },
    });
    expect(bytes.length).toBeGreaterThan(500);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("führt mehrere PDFs zusammen", async () => {
    const single = await renderLetterPdf({
      settings: defaultSettings,
      recipient: ["Person A"],
      date: "03.09.2026",
      subject: "Test",
      body: "Text",
    });
    const merged = await mergePdfs([single, single, single]);
    expect(new TextDecoder().decode(merged.slice(0, 5))).toBe("%PDF-");
    expect(merged.length).toBeGreaterThan(single.length);
  });
});
