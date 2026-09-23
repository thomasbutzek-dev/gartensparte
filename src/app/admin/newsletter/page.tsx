import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { requireModule } from "@/lib/modules";
import {
  DEFAULT_NEWSLETTER_NOTE,
  DEFAULT_NEWSLETTER_TITLE,
  newsletterHeadingDraft,
  newsletterNoteDraft,
} from "@/lib/newsletter-copy";
import SaveButton from "@/components/SaveButton";
import { btnDanger, card, input, label, tableClass, td, th } from "@/lib/ui";
import { deleteSubscriber, saveNewsletterCopy } from "./actions";

export default async function NewsletterAdminPage({ searchParams }: PageProps<"/admin/newsletter">) {
  await requireUser();
  requireModule("newsletter");
  const params = await searchParams;
  const rows = db
    .select()
    .from(tables.newsletterSubscribers)
    .orderBy(desc(tables.newsletterSubscribers.createdAt))
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="mt-1 text-sm text-stone-500">
          Überschrift und Text stehen auf der Website. Leer lassen zeigt den Standard. Es geht keine Mail raus.
        </p>
      </div>
      {params.ok === "text" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Texte gespeichert.</p>}
      {params.ok === "1" && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Adresse entfernt.</p>}
      <form action={saveNewsletterCopy} className={`${card} space-y-4`}>
        <div>
          <label className={label} htmlFor="title">Überschrift</label>
          <input
            id="title"
            name="title"
            maxLength={80}
            defaultValue={newsletterHeadingDraft()}
            placeholder={DEFAULT_NEWSLETTER_TITLE}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="note">Zusätzlicher Text</label>
          <textarea
            id="note"
            name="note"
            rows={5}
            maxLength={2000}
            defaultValue={newsletterNoteDraft()}
            placeholder={DEFAULT_NEWSLETTER_NOTE}
            className={input}
          />
        </div>
        <SaveButton>Speichern</SaveButton>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">Noch niemand angemeldet.</p>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>E-Mail</th>
                <th className={th}>Seit</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={td}>{row.email}</td>
                  <td className={td}>{formatDateTime(row.createdAt)}</td>
                  <td className={td}>
                    <form action={deleteSubscriber}>
                      <input type="hidden" name="id" value={row.id} />
                      <SaveButton className={btnDanger}>Entfernen</SaveButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
