import { describe, expect, it } from "vitest";
import { canSeeMoney } from "@/lib/auth";
import { listModules, moduleEnabled, setModuleEnabled } from "@/lib/modules";

const admin = {
  id: 1,
  name: "Administrator",
  username: "admin",
  role: "admin" as const,
  mustChangePassword: false,
};

describe("Module", () => {
  it("lässt die Kasse an und blendet sie nach dem Ausschalten aus", () => {
    expect(listModules().map((item) => item.id)).toEqual([
      "kasse",
      "newsletter",
      "schaukasten",
      "wetter",
      "verband",
    ]);
    expect(moduleEnabled("kasse")).toBe(true);
    expect(canSeeMoney(admin)).toBe(true);

    setModuleEnabled("kasse", false);
    expect(moduleEnabled("kasse")).toBe(false);
    expect(listModules()[0]?.enabled).toBe(false);
    expect(canSeeMoney(admin)).toBe(false);

    setModuleEnabled("kasse", true);
    expect(canSeeMoney(admin)).toBe(true);
  });
});
