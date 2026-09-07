"use client";

import { useMemo, useState } from "react";
import { DateField } from "@/components/DateField";
import { btnPrimary, card, input, label } from "@/lib/ui";
import { letterGroupLabels, type LetterGroup } from "@/lib/letter-catalog";
import { startLetter } from "./actions";

export type ComposerTemplate = {
  id: number;
  type: string;
  name: string;
  letterGroup: string;
};

export type ComposerTenancy = {
  memberId: number;
  firstName: string;
  lastName: string;
  gardenId: number;
  gardenNumber: number;
};

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaultDeadline(type: string): string {
  if (type.startsWith("kuendigung")) return `${new Date().getFullYear()}-11-30`;
  const date = new Date();
  if (type === "mahnung_pacht") {
    date.setMonth(date.getMonth() + 2);
    return isoDate(date);
  }
  date.setDate(date.getDate() + 14);
  return isoDate(date);
}

export default function LetterComposer({
  templates,
  tenancies,
}: {
  templates: ComposerTemplate[];
  tenancies: ComposerTenancy[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? 0);
  const selected = templates.find((item) => item.id === templateId) ?? templates[0];
  const isCircular = selected?.letterGroup === "rundschreiben";
  const grouped = useMemo(() => {
    const groups = new Map<string, ComposerTemplate[]>();
    for (const template of templates) {
      const list = groups.get(template.letterGroup) ?? [];
      list.push(template);
      groups.set(template.letterGroup, list);
    }
    return listGroups(groups);
  }, [templates]);

  return (
    <section className={`${card} space-y-3`}>
      <h2 className="text-lg font-semibold">Schreiben vorbereiten</h2>
      <p className="text-sm text-stone-500">
        Vorlage wählen, Empfänger und Angaben eintragen. Als Nächstes erscheint der Entwurf – den Text können Sie noch
        ändern, erst danach entsteht das PDF.
      </p>
      <form action={startLetter} className="space-y-3">
        <div>
          <label className={label} htmlFor="templateId">Vorlage</label>
          <select
            id="templateId"
            name="templateId"
            required
            className={input}
            value={templateId}
            onChange={(event) => setTemplateId(Number(event.target.value))}
          >
            {grouped.map(([group, items]) => (
              <optgroup key={group} label={letterGroupLabels[group as LetterGroup] ?? group}>
                {items.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {isCircular ? (
          <>
            <div>
              <label className={label} htmlFor="subject">Betreff</label>
              <input id="subject" name="subject" className={input} placeholder="z.B. Einladung Mitgliederversammlung" />
            </div>
            <div>
              <label className={label} htmlFor="text">Mitteilung</label>
              <textarea id="text" name="text" rows={5} required className={input} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={label} htmlFor="paar">Pächter / Garten</label>
              <select id="paar" name="paar" required className={input}>
                <option value="">Bitte wählen…</option>
                {tenancies.map((item) => (
                  <option key={`${item.memberId}-${item.gardenId}`} value={`${item.memberId}:${item.gardenId}`}>
                    Garten {item.gardenNumber} – {item.lastName}, {item.firstName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="frist">Frist / Wirksam zum</label>
                <DateField
                  id="frist"
                  name="frist"
                  key={selected?.type}
                  defaultValue={selected ? defaultDeadline(selected.type) : undefined}
                />
              </div>
              <div>
                <label className={label} htmlFor="grund">Aufforderung / Rechtsgrund</label>
                <input id="grund" name="grund" className={input} placeholder="Was erledigt werden soll, oder § …" />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="sachverhalt">Sachverhalt</label>
              <textarea
                id="sachverhalt"
                name="sachverhalt"
                rows={4}
                className={input}
                placeholder="Was genau festgestellt wurde, mit Datum wenn möglich."
              />
            </div>
          </>
        )}

        <button className={btnPrimary}>Entwurf öffnen</button>
        <p className="text-xs text-stone-500">
          Die mitgelieferten Texte folgen §§ 7, 8 und 9 BKleingG. Sie ersetzen keine Rechtsberatung. Kündigung nur
          schriftlich mit Unterschrift, Zugang nachweisen (Einwurf-Einschreiben oder Übergabe mit Zeugen).
        </p>
      </form>
    </section>
  );
}

function listGroups(groups: Map<string, ComposerTemplate[]>): [string, ComposerTemplate[]][] {
  const order = ["zahlung", "abmahnung", "kuendigung", "rundschreiben", "sonstiges"];
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}
