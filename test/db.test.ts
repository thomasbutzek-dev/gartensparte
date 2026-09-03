import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "gartensparte-test-"));

// Import erst nach Setzen von DATA_DIR
const { db, tables } = await import("@/db");
const { nextInvoiceNumber, getSettings, saveSettings } = await import("@/lib/settings");
const { parsePolygon } = await import("@/lib/map");

describe("Seed", () => {
  it("legt 104 Gärten an", () => {
    expect(db.select().from(tables.gardens).all()).toHaveLength(104);
  });

  it("legt ein Admin-Konto an", () => {
    const users = db.select().from(tables.users).all();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe("admin");
    expect(users[0].role).toBe("admin");
  });

  it("legt fünf Briefvorlagen an", () => {
    expect(db.select().from(tables.letterTemplates).all()).toHaveLength(5);
  });
});

describe("Rechnungsnummern", () => {
  it("vergibt fortlaufende Nummern pro Jahr", () => {
    expect(nextInvoiceNumber(2099)).toBe("2099-001");
    expect(nextInvoiceNumber(2099)).toBe("2099-002");
    expect(nextInvoiceNumber(2098)).toBe("2098-001");
    expect(nextInvoiceNumber(2099)).toBe("2099-003");
  });
});

describe("Einstellungen", () => {
  it("liefert Standardwerte und speichert Änderungen", () => {
    const before = getSettings();
    expect(before.mitgliedsbeitragCents).toBeGreaterThan(0);
    saveSettings({ ...before, vereinName: "Testverein e.V.", pachtCentProQm: 45 });
    const after = getSettings();
    expect(after.vereinName).toBe("Testverein e.V.");
    expect(after.pachtCentProQm).toBe(45);
  });
});

describe("Karten-Polygone", () => {
  it("parst gültige Polygone", () => {
    expect(parsePolygon("[[0,0],[10,0],[10,10]]")).toEqual([[0, 0], [10, 0], [10, 10]]);
  });

  it("verwirft ungültige Werte", () => {
    expect(parsePolygon(null)).toBeNull();
    expect(parsePolygon("kein json")).toBeNull();
    expect(parsePolygon("[[0,0],[1,1]]")).toBeNull(); // weniger als 3 Punkte
  });
});
