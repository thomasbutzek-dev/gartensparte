import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "gartensparte-test-"));

// Import erst nach Setzen von DATA_DIR
const { db, tables } = await import("@/db");
const { nextInvoiceNumber, getSettings, saveSettings } = await import("@/lib/settings");
const { insertIndexOnEdge, parsePolygon } = await import("@/lib/map");
const { applyGardenCount, removeGarden } = await import("@/lib/gardens");
const { collectGardenAttributes, gardenAttributeOptions, parseGardenAttributes, rememberGardenAttribute } = await import("@/lib/garden-attributes");
const { gardenStatusLabels } = await import("@/lib/ui");
const { listPublishedNews } = await import("@/lib/site");

describe("Seed", () => {
  it("legt keine Gärten an", () => {
    expect(db.select().from(tables.gardens).all()).toHaveLength(0);
  });

  it("legt ein Admin-Konto an", () => {
    const users = db.select().from(tables.users).all();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe("admin");
    expect(users[0].role).toBe("admin");
  });

  it("legt die Briefvorlagen an", async () => {
    const { LETTER_CATALOG } = await import("@/lib/letter-catalog");
    expect(db.select().from(tables.letterTemplates).all()).toHaveLength(LETTER_CATALOG.length);
  });
});

describe("Gartenanzahl", () => {
  it("legt Nummern 1 bis N an, entfernt Leere und behält Pacht", () => {
    expect(applyGardenCount(4)).toMatchObject({ created: 4, removed: 0, markedUnused: 0, keptBecauseTenant: 0 });
    expect(db.select().from(tables.gardens).all()).toHaveLength(4);

    db.update(tables.gardens).set({ note: "Akte" }).where(eq(tables.gardens.number, 4)).run();
    db.insert(tables.members).values({ firstName: "Inge", lastName: "Test" }).run();
    const member = db.select().from(tables.members).get();
    const garden3 = db.select().from(tables.gardens).where(eq(tables.gardens.number, 3)).get();
    expect(member && garden3).toBeTruthy();
    db.insert(tables.tenancies).values({ gardenId: garden3!.id, memberId: member!.id, startDate: "2026-01-01" }).run();

    const result = applyGardenCount(2);
    expect(result).toMatchObject({ created: 0, removed: 0, markedUnused: 1, keptBecauseTenant: 1 });
    const remaining = db.select().from(tables.gardens).all().sort((a, b) => a.number - b.number);
    expect(remaining.map((garden) => garden.number)).toEqual([1, 2, 3, 4]);
    expect(remaining.find((garden) => garden.number === 4)?.status).toBe("entfaellt");

    expect(applyGardenCount(6).created).toBe(2);
    expect(applyGardenCount(4)).toMatchObject({ created: 0, removed: 2, markedUnused: 0, keptBecauseTenant: 0 });
    expect(db.select().from(tables.gardens).all().map((garden) => garden.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("löscht eine Nummer ohne Pächter und blockiert eine mit Pächter", () => {
    const empty = db.select().from(tables.gardens).where(eq(tables.gardens.number, 1)).get();
    const rented = db.select().from(tables.gardens).where(eq(tables.gardens.number, 3)).get();
    expect(empty && rented).toBeTruthy();
    expect(removeGarden(rented!.id)).toEqual({ error: "pacht" });
    expect(removeGarden(empty!.id)).toMatchObject({ ok: true, number: 1, files: [] });
    expect(db.select().from(tables.gardens).where(eq(tables.gardens.number, 1)).get()).toBeUndefined();
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

describe("Briefvorlagen", () => {
  it("hat eindeutige Typ-Schlüssel", async () => {
    const { LETTER_CATALOG } = await import("@/lib/letter-catalog");
    const types = LETTER_CATALOG.map((item) => item.type);
    expect(new Set(types).size).toBe(types.length);
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
    expect(parsePolygon("[[0,0],[10,\"x\"],[10,10]]")).toBeNull();
    expect(parsePolygon("[[0,0],10,[10,10]]")).toBeNull();
  });

  it("findet den Einfügepunkt auf einer Kante", () => {
    const square: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
    expect(insertIndexOnEdge(square, [50, 0], 8)).toBe(1);
    expect(insertIndexOnEdge(square, [0, 0], 8)).toBeNull();
    expect(insertIndexOnEdge(square, [50, 50], 8)).toBeNull();
  });
});

describe("Garten-Merkmale", () => {
  it("kennt nur die vier Statuswerte", () => {
    expect(Object.keys(gardenStatusLabels)).toEqual(["verpachtet", "frei", "entfaellt", "kuendigung"]);
    expect(gardenStatusLabels.kuendigung).toBe("Gekündigt");
    expect(gardenStatusLabels.entfaellt).toBe("Nicht vergeben");
  });

  it("parst Merkmale und nimmt ein neues aus dem Formular auf", () => {
    expect(parseGardenAttributes('["verwahrlost","kein-anbau"]')).toEqual(["verwahrlost", "kein-anbau"]);
    expect(parseGardenAttributes("kein json")).toEqual([]);
    const formData = new FormData();
    formData.append("attribute", "verwahrlost");
    formData.append("newAttribute", "Wildwuchs");
    expect(collectGardenAttributes(formData)).toEqual(["verwahrlost", "Wildwuchs"]);
    expect(rememberGardenAttribute("Wildwuchs")).toBe("bekannt");
    expect(rememberGardenAttribute("")).toBe("leer");
    expect(gardenAttributeOptions().some((item) => item.value === "Wildwuchs")).toBe(true);
  });
});

describe("News oben halten", () => {
  it("zeigt gehaltene Meldungen vor neueren", () => {
    db.insert(tables.news)
      .values([
        {
          title: "Neu",
          body: "Text",
          status: "veroeffentlicht",
          pinned: false,
          publishedAt: "2026-09-08T12:00:00.000Z",
          createdAt: "2026-09-08T12:00:00.000Z",
        },
        {
          title: "Wichtig",
          body: "Text",
          status: "veroeffentlicht",
          pinned: true,
          publishedAt: "2026-01-01T12:00:00.000Z",
          createdAt: "2026-01-01T12:00:00.000Z",
        },
        {
          title: "Entwurf",
          body: "Text",
          status: "entwurf",
          pinned: true,
          publishedAt: null,
          createdAt: "2026-09-08T12:00:00.000Z",
        },
      ])
      .run();

    expect(listPublishedNews().map((item) => item.title)).toEqual(["Wichtig", "Neu"]);
  });
});
