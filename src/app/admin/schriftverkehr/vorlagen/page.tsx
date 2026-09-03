import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { btn, btnPrimary, card, input, label } from "@/lib/ui";
import { updateTemplate } from "../actions";

const typeLabels: Record<string, string> = {
  rechnung: "Rechnung",
  mahnung1: "Zahlungserinnerung (1. Mahnung)",
  mahnung2: "2. Mahnung",
  kuendigung: "Kündigung",
  rundschreiben: "Rundschreiben",
};

const placeholderHelp: Record<string, string> = {
  rechnung: "{{name}}, {{jahr}}, {{garten_nummer}}, {{betrag}}, {{frist}}, {{rechnungsnummer}}, {{verein}}",
  mahnung1: "{{name}}, {{beschreibung}}, {{betrag}}, {{faellig}}, {{frist}}, {{verein}}",
  mahnung2: "{{name}}, {{beschreibung}}, {{betrag}}, {{faellig}}, {{frist}}, {{verein}}",
  kuendigung: "{{name}}, {{garten_nummer}}, {{frist}}, {{grund}}, {{verein}}",
  rundschreiben: "{{name}}, {{text}}, {{verein}}",
};

export default async function VorlagenPage({ searchParams }: PageProps<"/admin/schriftverkehr/vorlagen">) {
  await requireUser();
  const params = await searchParams;
  const templates = db.select().from(tables.letterTemplates).orderBy(asc(tables.letterTemplates.id)).all();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Briefvorlagen</h1>
        <Link href="/admin/schriftverkehr" className={btn}>← Schriftverkehr</Link>
      </div>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Vorlage gespeichert.</p>}
      {params.fehler && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Betreff und Text dürfen nicht leer sein.</p>}
      <p className="text-sm text-stone-500">
        Platzhalter in doppelten geschweiften Klammern werden beim Erstellen automatisch ersetzt.
      </p>
      {templates.map((template) => (
        <form key={template.id} action={updateTemplate.bind(null, template.id)} className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">{typeLabels[template.type] ?? template.type}</h2>
          <p className="text-xs text-stone-500">Verfügbare Platzhalter: {placeholderHelp[template.type]}</p>
          <div>
            <label className={label} htmlFor={`subject-${template.id}`}>Betreff</label>
            <input id={`subject-${template.id}`} name="subject" defaultValue={template.subject} required className={input} />
          </div>
          <div>
            <label className={label} htmlFor={`body-${template.id}`}>Text</label>
            <textarea id={`body-${template.id}`} name="body" rows={8} defaultValue={template.body} required className={input} />
          </div>
          <button className={btnPrimary}>Speichern</button>
        </form>
      ))}
    </div>
  );
}
