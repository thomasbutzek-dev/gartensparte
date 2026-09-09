import { describe, expect, it } from "vitest";
import {
  canAdministerRole,
  canManageMoneyRole,
  canSeeMoneyRole,
  canSeeSettingsRole,
  canWriteRole,
  isDemoRole,
} from "@/lib/roles";

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
