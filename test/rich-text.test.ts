import { describe, expect, it } from "vitest";
import { isRichTextEmpty, looksLikeHtml, richTextPlain, sanitizeRichText, toDisplayHtml } from "@/lib/rich-text";

describe("Formatierter Text", () => {
  it("lässt Fett, Listen und Links durch und entfernt Script", () => {
    const clean = sanitizeRichText(
      '<p>Hallo <strong>Vorstand</strong></p><script>alert(1)</script><a href="https://example.de">Seite</a>',
    );
    expect(clean).toContain("<strong>Vorstand</strong>");
    expect(clean).toContain("https://example.de");
    expect(clean).not.toContain("script");
  });

  it("erkennt leere Editor-Absätze als leer", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("<p><br></p>")).toBe(true);
    expect(isRichTextEmpty("<p>Termin</p>")).toBe(false);
  });

  it("zeigt alten Fließtext mit Zeilenumbrüchen weiter richtig", () => {
    expect(looksLikeHtml("Bitte Kanister\nbereithalten.")).toBe(false);
    expect(toDisplayHtml("Bitte Kanister\nbereithalten.")).toContain("<br");
    expect(richTextPlain("<p>Bitte <strong>kommen</strong></p>")).toBe("Bitte kommen");
  });

  it("macht aus unsicheren Links keine javascript-Adressen", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">klick</a>')).not.toContain("javascript:");
  });
});
