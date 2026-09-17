import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "gartensparte-invoice-"));

const { db, tables } = await import("@/db");
const { previewAnnualInvoices, runAnnualInvoiceYear } = await import("@/lib/annual-invoices");

let gardenNumber = 80;

function insertTenant(status: "aktiv" | "ausgeschieden" = "aktiv") {
  gardenNumber += 1;
  const member = db
    .insert(tables.members)
    .values({ firstName: "Inge", lastName: "Pächter", status })
    .returning()
    .get();
  const garden = db
    .insert(tables.gardens)
    .values({ number: gardenNumber, sizeSqm: 200, status: "verpachtet" })
    .returning()
    .get();
  db.insert(tables.tenancies).values({ gardenId: garden.id, memberId: member.id, startDate: "2026-01-01" }).run();
  return { member, garden };
}

describe("Jahresrechnung", () => {
  it("zählt nur aktive Pächter ohne bestehenden Beitrag", () => {
    expect(previewAnnualInvoices(2031)).toEqual({ year: 2031, members: 0, alreadyBilled: 0, toCreate: 0 });
    insertTenant();
    expect(previewAnnualInvoices(2031)).toEqual({ year: 2031, members: 1, alreadyBilled: 0, toCreate: 1 });
  });

  it("legt Beitrag an und überspringt denselben Pächter beim zweiten Lauf", async () => {
    const admin = db.select().from(tables.users).where(eq(tables.users.username, "admin")).get();
    expect(admin).toBeTruthy();
    const first = await runAnnualInvoiceYear(2031, admin!.id);
    expect(first).toEqual({ created: 1, skipped: 0 });
    const payments = db.select().from(tables.payments).where(eq(tables.payments.year, 2031)).all();
    expect(payments.some((row) => row.type === "beitrag")).toBe(true);
    expect(payments.some((row) => row.type === "pacht")).toBe(true);
    expect(previewAnnualInvoices(2031)).toEqual({ year: 2031, members: 1, alreadyBilled: 1, toCreate: 0 });
    expect(await runAnnualInvoiceYear(2031, admin!.id)).toEqual({ created: 0, skipped: 1 });
  });

  it("rechnet Wasser und Strom getrennt aus den Ablesungen", async () => {
    const { getSettings, saveSettings } = await import("@/lib/settings");
    const { member, garden } = insertTenant();
    saveSettings({
      ...getSettings(),
      wasserCentProM3: 200,
      wasserGrundgebuehrCents: 500,
    });
    db.insert(tables.meterReadings)
      .values([
        { gardenId: garden.id, kind: "wasser", date: "2039-12-15", value: 100 },
        { gardenId: garden.id, kind: "wasser", date: "2040-12-10", value: 140 },
        { gardenId: garden.id, kind: "strom", date: "2039-12-15", value: 500 },
        { gardenId: garden.id, kind: "strom", date: "2040-12-10", value: 600 },
      ])
      .run();
    const admin = db.select().from(tables.users).where(eq(tables.users.username, "admin")).get();
    const result = await runAnnualInvoiceYear(2040, admin!.id);
    expect(result.created).toBeGreaterThanOrEqual(1);
    const payments = db.select().from(tables.payments).where(eq(tables.payments.memberId, member.id)).all();
    expect(payments.find((row) => row.type === "wasser")?.amountCents).toBe(40 * 200 + 500);
    expect(payments.find((row) => row.type === "strom")?.amountCents).toBe(100 * 40 + 1000);
  });

  it("rechnet keine Fehlstunden bei Befreiung im Rechnungsjahr", async () => {
    const { member } = insertTenant();
    db.update(tables.tenancies).set({ startDate: "2041-01-01" }).where(eq(tables.tenancies.memberId, member.id)).run();
    db.insert(tables.workExemptions).values({ memberId: member.id, year: 2041, reason: "Vorstand" }).run();
    const admin = db.select().from(tables.users).where(eq(tables.users.username, "admin")).get();
    await runAnnualInvoiceYear(2041, admin!.id);
    const payments = db.select().from(tables.payments).where(eq(tables.payments.memberId, member.id)).all();
    expect(payments.some((row) => row.type === "arbeitsstunden")).toBe(false);
  });

  it("rechnet Fehlstunden desselben Jahres ohne Befreiung", async () => {
    const { member } = insertTenant();
    db.update(tables.tenancies).set({ startDate: "2043-01-01" }).where(eq(tables.tenancies.memberId, member.id)).run();
    const admin = db.select().from(tables.users).where(eq(tables.users.username, "admin")).get();
    await runAnnualInvoiceYear(2043, admin!.id);
    const payments = db.select().from(tables.payments).where(eq(tables.payments.memberId, member.id)).all();
    expect(payments.find((row) => row.type === "arbeitsstunden")?.amountCents).toBe(8 * 1500);
  });

  it("rechnet keine Fehlstunden ohne Pacht in dem Jahr", async () => {
    const { member } = insertTenant();
    db.update(tables.tenancies).set({ startDate: "2042-03-01" }).where(eq(tables.tenancies.memberId, member.id)).run();
    const admin = db.select().from(tables.users).where(eq(tables.users.username, "admin")).get();
    await runAnnualInvoiceYear(2041, admin!.id);
    const payments = db.select().from(tables.payments).where(eq(tables.payments.memberId, member.id)).all();
    expect(payments.some((row) => row.type === "arbeitsstunden")).toBe(false);
  });

  it("lässt ausgeschiedene Mitglieder außen vor", () => {
    const before = previewAnnualInvoices(2032).members;
    insertTenant("ausgeschieden");
    expect(previewAnnualInvoices(2032).members).toBe(before);
  });
});
