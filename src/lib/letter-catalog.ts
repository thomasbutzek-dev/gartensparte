export type LetterGroup = "zahlung" | "abmahnung" | "kuendigung" | "rundschreiben" | "sonstiges";

export type LetterEffect = "none" | "kuendigung";

export type LetterTemplateSeed = {
  type: string;
  name: string;
  letterGroup: LetterGroup;
  effect: LetterEffect;
  locked: boolean;
  subject: string;
  body: string;
};

export const letterGroupLabels: Record<LetterGroup, string> = {
  zahlung: "Zahlung",
  abmahnung: "Abmahnung",
  kuendigung: "Kündigung",
  rundschreiben: "Rundschreiben",
  sonstiges: "Sonstiges",
};

export const archiveTypeLabels: Record<string, string> = {
  rechnung: "Rechnung",
  mahnung: "Mahnung",
  abmahnung: "Abmahnung",
  kuendigung: "Kündigung",
  rundschreiben: "Rundschreiben",
  sonstiges: "Sonstiges",
};

export function archiveTypeFor(template: { type: string; letterGroup: string }): string {
  if (template.type === "rechnung") return "rechnung";
  if (template.letterGroup === "zahlung") return "mahnung";
  if (template.letterGroup === "abmahnung") return "abmahnung";
  if (template.letterGroup === "kuendigung") return "kuendigung";
  if (template.letterGroup === "rundschreiben") return "rundschreiben";
  return "sonstiges";
}

export const LETTER_CATALOG: LetterTemplateSeed[] = [
  {
    type: "rechnung",
    name: "Jahresrechnung",
    letterGroup: "zahlung",
    effect: "none",
    locked: true,
    subject: "Rechnung {{rechnungsnummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nfür {{jahr}} berechnen wir für Garten {{garten_nummer}} die unten aufgeführten Positionen.\n\n{{positionen}}\n\nGesamtbetrag: {{betrag}}\nBitte überweisen Sie den Betrag bis zum {{frist}} auf unser Vereinskonto.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "mahnung1",
    name: "1. Mahnung (Zahlung)",
    letterGroup: "zahlung",
    effect: "none",
    locked: true,
    subject: "Zahlungserinnerung",
    body:
      "Sehr geehrte/r {{name}},\n\nfür {{beschreibung}} ist noch ein Betrag von {{betrag}} offen (fällig am {{faellig}}).\n\nBitte überweisen Sie den Betrag bis zum {{frist}} auf das Vereinskonto.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "mahnung2",
    name: "2. Mahnung (Zahlung)",
    letterGroup: "zahlung",
    effect: "none",
    locked: true,
    subject: "2. Mahnung",
    body:
      "Sehr geehrte/r {{name}},\n\ntrotz unserer Zahlungserinnerung ist für {{beschreibung}} weiterhin ein Betrag von {{betrag}} offen (fällig am {{faellig}}).\n\nBitte überweisen Sie den Betrag bis spätestens {{frist}}. Geht bis dahin nichts ein, behalten wir uns weitere Schritte vor.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "mahnung_beitreibung",
    name: "Ankündigung der Beitreibung",
    letterGroup: "zahlung",
    effect: "none",
    locked: false,
    subject: "Ankündigung der Beitreibung",
    body:
      "Sehr geehrte/r {{name}},\n\nfür {{beschreibung}} ist trotz Mahnung weiterhin ein Betrag von {{betrag}} offen.\n\nWir fordern Sie auf, den Betrag bis zum {{frist}} zu zahlen. Andernfalls behalten wir uns vor, den Anspruch gerichtlich geltend zu machen (Mahnverfahren).\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "mahnung_pacht",
    name: "Mahnung der Pacht (§ 8 Nr. 1 BKleingG)",
    letterGroup: "zahlung",
    effect: "none",
    locked: false,
    subject: "Mahnung der Pacht – Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nfür Garten {{garten_nummer}} ist die Pacht ganz oder teilweise offen: {{beschreibung}} {{betrag}}.\n\nNach § 8 Nr. 1 BKleingG kann der Pachtvertrag ohne Kündigungsfrist gekündigt werden, wenn die Pacht für mindestens ein Vierteljahr im Rückstand ist und sie nicht innerhalb von zwei Monaten nach dieser Mahnung gezahlt wird.\n\nBitte zahlen Sie bis zum {{frist}}. Die Frist beträgt zwei Monate ab Zugang dieses Schreibens.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "abmahnung_nutzung",
    name: "Abmahnung: kleingärtnerische Nutzung",
    letterGroup: "abmahnung",
    effect: "none",
    locked: false,
    subject: "Abmahnung – Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nbei Garten {{garten_nummer}} stellen wir fest:\n\n{{sachverhalt}}\n\nDas verstößt gegen die Pflicht zur kleingärtnerischen Nutzung. Nach § 9 Abs. 1 Nr. 1 BKleingG kann der Pachtvertrag gekündigt werden, wenn eine solche Pflichtverletzung trotz Abmahnung andauert.\n\nWir fordern Sie auf, bis zum {{frist}} Folgendes zu erledigen:\n{{grund}}\n\nKommt das nicht, behalten wir uns die Kündigung vor. Diese Abmahnung bedarf der Textform; bitte bewahren Sie dieses Schreiben auf.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "abmahnung_verwahrlosung",
    name: "Abmahnung: Bewirtschaftungsmängel / Verwahrlosung",
    letterGroup: "abmahnung",
    effect: "none",
    locked: false,
    subject: "Abmahnung wegen Bewirtschaftungsmängeln – Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nGarten {{garten_nummer}} weist erhebliche Bewirtschaftungsmängel auf:\n\n{{sachverhalt}}\n\nNach § 9 Abs. 1 Nr. 1 BKleingG sind solche Mängel innerhalb einer angemessenen Frist abzustellen. Wir setzen Ihnen dafür Frist bis zum {{frist}}.\n\nZu erledigen:\n{{grund}}\n\nWerden die Mängel nicht fristgerecht beseitigt, behalten wir uns die ordentliche Kündigung zum 30. November vor.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "abmahnung_gemeinschaft",
    name: "Abmahnung: Gemeinschaftsleistung",
    letterGroup: "abmahnung",
    effect: "none",
    locked: false,
    subject: "Abmahnung – Gemeinschaftsleistung, Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nSie sind der Gemeinschaftsleistung nicht nachgekommen:\n\n{{sachverhalt}}\n\n§ 9 Abs. 1 Nr. 1 BKleingG nennt die Verweigerung geldlicher oder sonstiger Gemeinschaftsleistungen als Pflichtverletzung, die nach Abmahnung zur Kündigung führen kann.\n\nBitte erledigen Sie bis zum {{frist}}:\n{{grund}}\n\nAndernfalls behalten wir uns die Kündigung vor.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "abmahnung_laube",
    name: "Abmahnung: Wohnen in der Laube",
    letterGroup: "abmahnung",
    effect: "none",
    locked: false,
    subject: "Abmahnung – Nutzung der Laube, Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nzu Garten {{garten_nummer}} stellen wir fest:\n\n{{sachverhalt}}\n\nDie Laube darf nicht zum dauernden Wohnen genutzt werden (§ 9 Abs. 1 Nr. 1 BKleingG).\n\nWir fordern Sie auf, das Wohnen bis zum {{frist}} einzustellen. {{grund}}\n\nAndernfalls behalten wir uns die Kündigung vor.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "abmahnung_dritte",
    name: "Abmahnung: Überlassung an Dritte",
    letterGroup: "abmahnung",
    effect: "none",
    locked: false,
    subject: "Abmahnung – Überlassung des Gartens {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nGarten {{garten_nummer}} ist ohne unsere Zustimmung einem Dritten überlassen worden:\n\n{{sachverhalt}}\n\nDas ist nach § 9 Abs. 1 Nr. 1 BKleingG eine Pflichtverletzung.\n\nBitte stellen Sie den vertragswidrigen Zustand bis zum {{frist}} ab. {{grund}}\n\nAndernfalls behalten wir uns die Kündigung vor.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "abmahnung_androhung",
    name: "Abmahnung mit Androhung der Kündigung",
    letterGroup: "abmahnung",
    effect: "none",
    locked: false,
    subject: "Letzte Abmahnung – Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nwir haben Sie bereits auf Pflichtverletzungen bei Garten {{garten_nummer}} hingewiesen. Der Mangel besteht fort:\n\n{{sachverhalt}}\n\nDas ist die Abmahnung in Textform nach § 9 Abs. 1 Nr. 1 BKleingG. Wir setzen Ihnen Frist bis zum {{frist}}, um Folgendes zu erledigen:\n{{grund}}\n\nGeschieht das nicht, kündigen wir den Pachtvertrag. Eine ordentliche Kündigung ist nur zum 30. November zulässig und muss Ihnen spätestens am dritten Werktag im August zugehen (§ 9 Abs. 2 BKleingG).\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "kuendigung",
    name: "Fristgerechte Kündigung (§ 9 BKleingG)",
    letterGroup: "kuendigung",
    effect: "kuendigung",
    locked: true,
    subject: "Kündigung des Pachtvertrags für Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nhiermit kündigen wir den Kleingartenpachtvertrag für Garten {{garten_nummer}} ordentlich zum {{frist}} (§ 9 BKleingG).\n\nGrund:\n{{grund}}\n\nSachverhalt:\n{{sachverhalt}}\n\nEiner Abmahnung in Textform ist keine Abhilfe gefolgt. Die Kündigung bedarf der Schriftform (§ 7 BKleingG). Sie gilt nur zum 30. November; sie muss spätestens am dritten Werktag im August zugehen (§ 9 Abs. 2 BKleingG).\n\nBitte vereinbaren Sie rechtzeitig einen Termin zur Gartenübergabe.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "kuendigung_fristlos",
    name: "Fristlose Kündigung (§ 8 BKleingG)",
    letterGroup: "kuendigung",
    effect: "kuendigung",
    locked: false,
    subject: "Fristlose Kündigung – Garten {{garten_nummer}}",
    body:
      "Sehr geehrte/r {{name}},\n\nhiermit kündigen wir den Kleingartenpachtvertrag für Garten {{garten_nummer}} ohne Einhaltung einer Kündigungsfrist (§ 8 BKleingG).\n\nGrund:\n{{grund}}\n\nSachverhalt:\n{{sachverhalt}}\n\n§ 8 Nr. 1 BKleingG: Pachtrückstand von mindestens einem Vierteljahr und keine Zahlung innerhalb von zwei Monaten nach Mahnung in Textform.\n§ 8 Nr. 2 BKleingG: schwerwiegende Pflichtverletzung, insbesondere nachhaltige Störung des Friedens in der Kleingärtnergemeinschaft.\n\nDie Kündigung bedarf der Schriftform (§ 7 BKleingG). Bitte räumen Sie den Garten und vereinbaren Sie die Übergabe.\n\nMit freundlichen Grüßen\n{{verein}}",
  },
  {
    type: "rundschreiben",
    name: "Rundschreiben",
    letterGroup: "rundschreiben",
    effect: "none",
    locked: true,
    subject: "Mitteilung des Vorstands",
    body: "Sehr geehrte/r {{name}},\n\n{{text}}\n\nMit freundlichen Grüßen\n{{verein}}",
  },
];

export const COMMON_PLACEHOLDERS =
  "{{name}}, {{garten_nummer}}, {{frist}}, {{grund}}, {{sachverhalt}}, {{verein}}, {{datum}}, {{text}}, {{betrag}}, {{beschreibung}}, {{faellig}}";
