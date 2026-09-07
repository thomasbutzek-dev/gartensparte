import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { btn, btnPrimary, card, input, label } from "@/lib/ui";
import { deleteLetter, finalizeLetter, saveDraft } from "../actions";

export default async function BriefEntwurfPage({
  params,
  searchParams,
}: PageProps<"/admin/schriftverkehr/[id]">) {
  await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const letter = db.select().from(tables.letters).where(eq(tables.letters.id, Number(id))).get();
  if (!letter) notFound();

  const member = letter.memberId
    ? db.select().from(tables.members).where(eq(tables.members.id, letter.memberId)).get()
    : null;
  const garden = letter.gardenId
    ? db.select().from(tables.gardens).where(eq(tables.gardens.id, letter.gardenId)).get()
    : null;

  const isDraft = letter.status === "entwurf";
  const effect = letter.type === "kuendigung" ? "kuendigung" : "none";
  const saveAction = saveDraft.bind(null, letter.id);
  const finishAction = finalizeLetter.bind(null, letter.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{isDraft ? "Entwurf" : "Schreiben"}</h1>
        <Link href="/admin/schriftverkehr" className={btn}>← Briefe</Link>
      </div>

      {query.ok === "entwurf" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Entwurf gespeichert.</p>}
      {query.fehler === "leer" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Betreff und Text dürfen nicht leer sein.</p>}
      {query.fehler === "mitglieder" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Keine aktiven Mitglieder für das Rundschreiben.</p>}

      <p className="text-sm text-stone-500">
        {member ? `${member.firstName} ${member.lastName}` : "Alle aktiven Mitglieder"}
        {garden ? ` · Garten ${garden.number}` : ""}
      </p>

      {isDraft ? (
        <form className={`${card} space-y-4`}>
          <div>
            <label className={label} htmlFor="subject">Betreff</label>
            <input id="subject" name="subject" defaultValue={letter.subject} required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="body">Text</label>
            <textarea id="body" name="body" rows={18} defaultValue={letter.body} required className={input} />
          </div>
          <input type="hidden" name="effect" value={effect} />
          <div className="flex flex-wrap gap-2">
            <button formAction={saveAction} className={btn}>Entwurf speichern</button>
            <button formAction={finishAction} className={btnPrimary}>PDF endgültig erstellen</button>
          </div>
          {letter.type === "kuendigung" && (
            <p className="text-xs text-stone-500">
              Beim endgültigen Erstellen wird der Garten auf „Kündigung“ gesetzt. Das PDF muss unterschrieben werden.
            </p>
          )}
          {letter.type === "rundschreiben" && (
            <p className="text-xs text-stone-500">
              Es entsteht ein Sammel-PDF, ein Brief je aktivem Mitglied. Steht im Text noch {"{{name}}"}, wird der Name eingesetzt.
            </p>
          )}
        </form>
      ) : (
        <section className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">{letter.subject}</h2>
          {letter.body ? <pre className="whitespace-pre-wrap font-sans text-sm text-stone-800">{letter.body}</pre> : null}
          <a href={`/api/briefe/${letter.id}`} target="_blank" className={btnPrimary}>PDF öffnen</a>
        </section>
      )}

      <form action={deleteLetter.bind(null, letter.id)}>
        <button className="text-sm text-red-700 hover:underline">
          {isDraft ? "Entwurf verwerfen" : "Schreiben löschen"}
        </button>
      </form>
    </div>
  );
}
