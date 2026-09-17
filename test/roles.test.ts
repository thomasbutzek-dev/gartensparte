import { describe, expect, it } from "vitest";
import {
  canAdministerRole,
  canManageMoneyRole,
  canSeeMoneyRole,
  canSeeSettingsRole,
  canWriteRole,
  isDemoRole,
} from "@/lib/roles";
import { isMoneyLetterGroup, isMoneyLetterType } from "@/lib/letter-catalog";

describe("Rollen", () => {
  it("Demo darf alles anschauen, aber nichts speichern", () => {
    expect(isDemoRole("demo")).toBe(true);
    expect(canWriteRole("demo")).toBe(false);
    expect(canSeeMoneyRole("demo")).toBe(true);
    expect(canSeeSettingsRole("demo")).toBe(true);
    expect(canManageMoneyRole("demo")).toBe(false);
    expect(canAdministerRole("demo")).toBe(false);
  });

  it("Admin und Kassenwart dürfen buchen, Vorstand nicht", () => {
    expect(canWriteRole("admin")).toBe(true);
    expect(canWriteRole("vorstand")).toBe(true);
    expect(canManageMoneyRole("admin")).toBe(true);
    expect(canManageMoneyRole("kassenwart")).toBe(true);
    expect(canManageMoneyRole("vorstand")).toBe(false);
    expect(canSeeMoneyRole("vorstand")).toBe(false);
    expect(canAdministerRole("admin")).toBe(true);
    expect(canAdministerRole("kassenwart")).toBe(false);
    expect(canSeeSettingsRole("admin")).toBe(true);
    expect(canSeeSettingsRole("vorstand")).toBe(false);
    expect(canSeeSettingsRole("kassenwart")).toBe(false);
  });
});

describe("Briefarten", () => {
  it("Rechnungen und Mahnungen gehören zur Kasse", () => {
    expect(isMoneyLetterType("rechnung")).toBe(true);
    expect(isMoneyLetterType("mahnung")).toBe(true);
    expect(isMoneyLetterType("abmahnung")).toBe(false);
    expect(isMoneyLetterType("kuendigung")).toBe(false);
    expect(isMoneyLetterType("rundschreiben")).toBe(false);
    expect(isMoneyLetterGroup("zahlung")).toBe(true);
    expect(isMoneyLetterGroup("abmahnung")).toBe(false);
  });
});

