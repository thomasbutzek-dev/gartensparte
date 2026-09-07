import { describe, expect, it } from "vitest";
import { addressLines, boardExtraText, defaultSettings, mapsSearchUrl, officeHoursLabel } from "@/lib/settings";
import { freeGardenCtaLabel, gardenCountsFrom, showFreeGardenCount } from "@/lib/site";

describe("Öffentliche Adresse", () => {
  it("baut die OpenStreetMap-Suche nur mit Straße und Ort", () => {
    const url = mapsSearchUrl({
      ...defaultSettings,
      vereinName: "Gartensparte Test e.V.",
      vereinStrasse: "Gartenweg 4",
      vereinOrt: "12345 Musterstadt",
    });
    expect(url).toContain("openstreetmap.org/search");
    expect(url).toContain(encodeURIComponent("Gartenweg 4, 12345 Musterstadt"));
  });

  it("verlinkt bei gesetztem Punkt direkt auf die Koordinaten", () => {
    const url = mapsSearchUrl({
      ...defaultSettings,
      mapLat: 51.3397,
      mapLng: 12.3731,
    });
    expect(url).toContain("mlat=51.3397");
    expect(url).toContain("mlon=12.3731");
  });

  it("liefert ohne Adresse keinen Kartenlink", () => {
    expect(mapsSearchUrl(defaultSettings)).toBeNull();
  });

  it("lässt leere Adresszeilen weg", () => {
    expect(addressLines({ ...defaultSettings, vereinName: "Sparte", vereinStrasse: "", vereinOrt: "Leipzig" })).toEqual([
      "Sparte",
      "Leipzig",
    ]);
  });
});

describe("Freie Gärten auf der Website", () => {
  it("zeigt die Zahl nicht, wenn noch niemand verpachtet ist", () => {
    const counts = gardenCountsFrom(Array.from({ length: 104 }, () => ({ status: "frei" })));
    expect(counts).toEqual({ total: 104, free: 104, assigned: 0 });
    expect(showFreeGardenCount(counts)).toBe(false);
    expect(freeGardenCtaLabel(counts)).toBe("Freie Gärten ansehen");
  });

  it("zeigt die Zahl, sobald Gärten verpachtet und frei sind", () => {
    const counts = gardenCountsFrom([{ status: "verpachtet" }, { status: "frei" }, { status: "frei" }]);
    expect(showFreeGardenCount(counts)).toBe(true);
    expect(freeGardenCtaLabel(counts)).toBe("2 freie Gärten jetzt ansehen");
  });

  it("verweist auf die Anfrage, wenn nichts frei ist", () => {
    expect(freeGardenCtaLabel({ total: 2, free: 0, assigned: 2 })).toBe("Garten anfragen");
  });

  it("zählt historisch fehlende Nummern nicht als freie Gärten", () => {
    const counts = gardenCountsFrom([
      { status: "frei" },
      { status: "entfaellt" },
      { status: "entfaellt" },
      { status: "verpachtet" },
    ]);
    expect(counts).toEqual({ total: 2, free: 1, assigned: 1 });
    expect(showFreeGardenCount(counts)).toBe(true);
    expect(freeGardenCtaLabel(counts)).toBe("1 freien Garten jetzt ansehen");
  });
});

describe("Sprechzeiten", () => {
  it("nimmt das eigene Feld und hängt die Bezeichnung an, wenn sie fehlt", () => {
    expect(officeHoursLabel({ ...defaultSettings, sprechzeiten: "Jeden 1. Freitag vor dem Vereinsheim" })).toBe(
      "Sprechzeiten: Jeden 1. Freitag vor dem Vereinsheim",
    );
  });

  it("streicht Sprechzeiten aus dem Vorstandstext", () => {
    expect(
      boardExtraText({
        ...defaultSettings,
        ansprechpartnerText: "Vorstand\nSprechzeiten: nach Vereinbarung\n\nBitte das Formular nutzen.",
      }),
    ).toBe("Bitte das Formular nutzen.");
  });
});
