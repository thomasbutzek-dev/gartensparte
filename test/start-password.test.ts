import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WELL_KNOWN_START_PASSWORD,
  configuredStartPassword,
  demoEnabled,
  isStartPassword,
} from "@/lib/start-password";

describe("Startpasswort", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("erkennt das bekannte Startpasswort", () => {
    expect(isStartPassword(WELL_KNOWN_START_PASSWORD)).toBe(true);
    expect(isStartPassword("eigenes-passwort-123")).toBe(false);
    expect(isStartPassword("")).toBe(false);
  });

  it("erkennt auch das konfigurierte Startpasswort", () => {
    vi.stubEnv("ADMIN_START_PASSWORD", "mein-erstes-passwort");
    expect(configuredStartPassword()).toBe("mein-erstes-passwort");
    expect(isStartPassword("mein-erstes-passwort")).toBe(true);
  });

  it("lässt Demo in Tests zu", () => {
    expect(demoEnabled()).toBe(true);
  });

  it("schaltet Demo in Produktion aus, außer ENABLE_DEMO", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(demoEnabled()).toBe(false);
    vi.stubEnv("ENABLE_DEMO", "1");
    expect(demoEnabled()).toBe(true);
    vi.stubEnv("ENABLE_DEMO", "0");
    expect(demoEnabled()).toBe(false);
  });
});
