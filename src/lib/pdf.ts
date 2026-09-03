import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { VereinsSettings } from "@/lib/settings";
import { formatEuro } from "@/lib/settings";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 60;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;

export type InvoiceRow = { label: string; amountCents: number };

export type LetterOptions = {
  settings: VereinsSettings;
  /** Adresszeilen des Empfängers */
  recipient: string[];
  date: string; // bereits formatiert, z.B. 03.09.2026
  subject: string;
  /** Fließtext; Absätze durch \n\n, Zeilen durch \n */
  body: string;
  /** Optionale Positionstabelle (Rechnung) */
  table?: { rows: InvoiceRow[]; totalLabel: string };
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.trim() === "") {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of rawLine.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Entfernt Zeichen, die die Standard-PDF-Schrift (WinAnsi) nicht darstellen kann. */
function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7EäöüÄÖÜßéèêàáâçñ€„“”‚‘’–—°§]/g, "?");
}

export async function renderLetterPdf(options: LetterOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { settings } = options;

  let page = doc.addPage([A4.width, A4.height]);
  const contentWidth = A4.width - 2 * MARGIN;
  let y = A4.height - MARGIN;

  const drawText = (text: string, x: number, size = BODY_SIZE, usedFont = font, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(sanitize(text), { x, y, size, font: usedFont, color });
  };

  const newPageIfNeeded = () => {
    if (y < MARGIN + 60) {
      page = doc.addPage([A4.width, A4.height]);
      y = A4.height - MARGIN;
    }
  };

  // Briefkopf
  drawText(settings.vereinName, MARGIN, 14, bold, rgb(0.09, 0.36, 0.14));
  y -= 14;
  const headParts = [settings.vereinStrasse, settings.vereinOrt].filter(Boolean).join(" · ");
  if (headParts) {
    drawText(headParts, MARGIN, 9, font, rgb(0.4, 0.4, 0.4));
  }
  y -= 30;

  // Absenderzeile klein + Empfänger
  const senderLine = [settings.vereinName, settings.vereinStrasse, settings.vereinOrt].filter(Boolean).join(", ");
  if (senderLine) {
    drawText(senderLine, MARGIN, 7, font, rgb(0.5, 0.5, 0.5));
  }
  y -= 14;
  for (const line of options.recipient) {
    drawText(line, MARGIN, BODY_SIZE);
    y -= LINE_HEIGHT;
  }

  // Datum rechts
  y -= 20;
  const dateText = sanitize(options.date);
  page.drawText(dateText, {
    x: A4.width - MARGIN - font.widthOfTextAtSize(dateText, BODY_SIZE),
    y,
    size: BODY_SIZE,
    font,
  });
  y -= 34;

  // Betreff
  drawText(options.subject, MARGIN, 12, bold);
  y -= 26;

  // Fließtext
  for (const line of wrapText(options.body, font, BODY_SIZE, contentWidth)) {
    newPageIfNeeded();
    if (line !== "") drawText(line, MARGIN);
    y -= LINE_HEIGHT;
  }

  // Positionstabelle
  if (options.table && options.table.rows.length > 0) {
    y -= 10;
    const amountX = A4.width - MARGIN;
    for (const row of options.table.rows) {
      newPageIfNeeded();
      drawText(row.label, MARGIN + 10);
      const amount = sanitize(formatEuro(row.amountCents));
      page.drawText(amount, { x: amountX - font.widthOfTextAtSize(amount, BODY_SIZE), y, size: BODY_SIZE, font });
      y -= LINE_HEIGHT;
    }
    y -= 4;
    page.drawLine({
      start: { x: MARGIN + 10, y: y + 10 },
      end: { x: amountX, y: y + 10 },
      thickness: 0.75,
      color: rgb(0.3, 0.3, 0.3),
    });
    const total = options.table.rows.reduce((sum, row) => sum + row.amountCents, 0);
    newPageIfNeeded();
    drawText(options.table.totalLabel, MARGIN + 10, BODY_SIZE, bold);
    const totalText = sanitize(formatEuro(total));
    page.drawText(totalText, { x: amountX - bold.widthOfTextAtSize(totalText, BODY_SIZE), y, size: BODY_SIZE, font: bold });
    y -= LINE_HEIGHT;
  }

  // Fußzeile auf jeder Seite
  const footerParts = [
    settings.vorsitzender ? `Vorsitzende/r: ${settings.vorsitzender}` : "",
    settings.bankName ? `${settings.bankName}` : "",
    settings.iban ? `IBAN: ${settings.iban}` : "",
    settings.bic ? `BIC: ${settings.bic}` : "",
  ].filter(Boolean);
  for (const p of doc.getPages()) {
    if (footerParts.length > 0) {
      p.drawText(sanitize(footerParts.join("  ·  ")), {
        x: MARGIN,
        y: MARGIN - 25,
        size: 8,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
  }

  return doc.save();
}

/** Mehrere Briefe (z.B. Rundschreiben) in eine PDF-Datei zusammenführen. */
export async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const bytes of pdfs) {
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  return merged.save();
}

/** Platzhalter wie {{name}} ersetzen. Unbekannte Platzhalter bleiben sichtbar stehen. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}
