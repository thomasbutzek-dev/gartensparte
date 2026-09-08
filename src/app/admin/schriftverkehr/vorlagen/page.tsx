import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { COMMON_PLACEHOLDERS, letterGroupLabels, type LetterGroup } from "@/lib/letter-catalog";
import { btn, btnPrimary, card, input, label } from "@/lib/ui";
import { createTemplate, deleteTemplate, updateTemplate } from "../actions";

export default async function VorlagenPage({ searchParams }: PageProps<"/admin/schriftverkehr/vorlagen">) {
  await requireUser();
  const params = await searchParams;
  const templates = db.select().from(tables.letterTemplates).orderBy(asc(tables.letterTemplates.letterGroup), asc(tables.letterTemplates.name)).all();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Briefvorlagen</h1>
        <Link href="/admin/schriftverkehr" className={btn}>← Briefe</Link>
      </div>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Vorlage gespeichert.</p>}
      {params.fehler && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Name, Betreff und Text dürfen nicht leer sein.</p>}
      <p className="text-sm text-stone-500">
        Platzhalter in doppelten geschweiften Klammern werden beim Entwurf ersetzt, den Text ändern Sie danach noch einmal.
        Üblich: {COMMON_PLACEHOLDERS}
      </p>

      <form action={createTemplate} className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Eigene Vorlage anlegen</h2>
        <div>
          <label className={label} htmlFor="newName">Name</label>
          <input id="newName" name="name" required className={input} placeholder="z.B. Hinweis Winterfestmachung" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="newGroup">Gruppe</label>
            <select id="newGroup" name="letterGroup" className={input}>
              {Object.entries(letterGroupLabels).map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="newEffect">Nach dem PDF</label>
            <select id="newEffect" name="effect" className={input}>
              <option value="none">Nichts weiter</option>
              <option value="kuendigung">Garten auf „Gekündigt“ setzen</option>
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="newSubject">Betreff</label>
          <input id="newSubject" name="subject" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="newBody">Text</label>
          <textarea id="newBody" name="body" rows={6} required className={input} />
        </div>
        <button className={btnPrimary}>Vorlage anlegen</button>
      </form>

      {templates.map((template) => (
        <form key={template.id} action={updateTemplate.bind(null, template.id)} className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">
                {letterGroupLabels[template.letterGroup as LetterGroup] ?? template.letterGroup}
              </p>
              <label className="sr-only" htmlFor={`name-${template.id}`}>Name</label>
              <input id={`name-${template.id}`} name="name" defaultValue={template.name || template.type} className={`${input} mt-1 font-semibold`} />
            </div>
            {!template.locked && (
              <button formAction={deleteTemplate.bind(null, template.id)} className="text-sm text-red-700 hover:underline">
                Löschen
              </button>
            )}
          </div>
          <div>
            <label className={label} htmlFor={`subject-${template.id}`}>Betreff</label>
            <input id={`subject-${template.id}`} name="subject" defaultValue={template.subject} required className={input} />
          </div>
          <div>
            <label className={label} htmlFor={`body-${template.id}`}>Text</label>
            <textarea id={`body-${template.id}`} name="body" rows={10} defaultValue={template.body} required className={input} />
          </div>
          <button className={btnPrimary}>Speichern</button>
        </form>
      ))}
    </div>
  );
}
