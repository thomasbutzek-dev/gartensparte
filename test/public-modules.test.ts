import { describe, expect, it } from "vitest";
import { isNoticeVisible } from "@/lib/notices";
import { parseVerbandFeed, safePublicUrl } from "@/lib/verband";
import { skyWord, weatherLabel } from "@/lib/weather";

describe("Wetter und Verband", () => {
  it("benennt die üblichen Wettercodes", () => {
    expect(weatherLabel(0)).toBe("Klar");
    expect(weatherLabel(61)).toBe("Regen");
    expect(weatherLabel(95)).toBe("Gewitter");
    expect(skyWord("Klar")).toBe("Sonne");
    expect(skyWord("Bewölkt")).toBe("Bewölkt");
    expect(skyWord("Schauer")).toBe("Regnerisch");
  });

  it("liest RSS und die Verbandsseite", () => {
    const rss = `<rss><channel><item><title>Apfeltag</title><link>https://example.com/a</link></item></channel></rss>`;
    expect(parseVerbandFeed(rss, "https://example.com/news")[0]).toMatchObject({ title: "Apfeltag", url: "https://example.com/a" });
    const html = `<base href="https://www.gartenfreunde-sachsen-anhalt.de" /><article><a href="/news/apfeltag/1" title="&quot;Der Kleing&auml;rtner&quot;"><img src="data/vorschaubild.jpg"></a> 17.09.2026</article>`;
    expect(parseVerbandFeed(html, "https://www.gartenfreunde-sachsen-anhalt.de/news")[0]).toMatchObject({
      title: '"Der Kleingärtner"',
      url: "https://www.gartenfreunde-sachsen-anhalt.de/news/apfeltag/1",
      date: "17.09.2026",
      image: "https://www.gartenfreunde-sachsen-anhalt.de/data/vorschaubild.jpg",
    });
  });

  it("lässt nur öffentliche Adressen zu", () => {
    expect(safePublicUrl("https://www.gartenfreunde-sachsen-anhalt.de/news")?.href).toContain("gartenfreunde");
    expect(safePublicUrl("http://127.0.0.1/news")).toBeNull();
    expect(safePublicUrl("file:///tmp/x")).toBeNull();
  });

  it("zeigt Aushänge nur im Datumsfenster", () => {
    expect(isNoticeVisible({ status: "entwurf", validFrom: "", validUntil: "" }, "2026-09-22")).toBe(false);
    expect(isNoticeVisible({ status: "veroeffentlicht", validFrom: "2026-09-23", validUntil: "" }, "2026-09-22")).toBe(false);
    expect(isNoticeVisible({ status: "veroeffentlicht", validFrom: "", validUntil: "2026-09-21" }, "2026-09-22")).toBe(false);
    expect(isNoticeVisible({ status: "veroeffentlicht", validFrom: "2026-09-01", validUntil: "2026-09-30" }, "2026-09-22")).toBe(true);
  });
});
