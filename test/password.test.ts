import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("Passwort-Hashing", () => {
  it("verifiziert das korrekte Passwort", () => {
    const hash = hashPassword("geheim-123");
    expect(verifyPassword("geheim-123", hash)).toBe(true);
  });

  it("lehnt falsche Passwörter ab", () => {
    const hash = hashPassword("geheim-123");
    expect(verifyPassword("falsch", hash)).toBe(false);
  });

  it("erzeugt pro Aufruf ein neues Salt", () => {
    expect(hashPassword("x")).not.toBe(hashPassword("x"));
  });

  it("stürzt bei kaputten Hashes nicht ab", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "ohne-doppelpunkt")).toBe(false);
    expect(verifyPassword("x", "salz:keinhex")).toBe(false);
  });
});
