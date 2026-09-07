import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import FileDropField from "@/components/FileDropField";
import { publicCategoryLabel, publicCategoryOptions } from "@/lib/categories";
import { badge, btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import { deleteDocument, toggleDocumentPublic, uploadDocument } from "./actions";

export default async function AdminDokumentePage({ searchParams }: PageProps<"/admin/dokumente">) {
  await requireUser();
  const params = await searchParams;
  const docs = db.select().from(tables.documents).orderBy(desc(tables.documents.uploadedAt)).all();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dokumente</h1>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Dokument hochgeladen.</p>}
      {params.fehler === "eingabe" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Titel und Datei angeben.</p>}
      {params.fehler === "datei" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Upload fehlgeschlagen. Erlaubt sind PDF, JPG, PNG, WebP, DOCX, XLSX bis 15 MB.</p>
      )}
      <p className="text-sm text-stone-500">
        „Öffentlich“ = auf der Website sichtbar (z.B. Satzung, Formulare). Interne Dokumente (z.B. Protokolle) sehen nur angemeldete Vorstandsmitglieder.
      </p>

      <form action={uploadDocument} className={`${card} grid gap-3 sm:grid-cols-2`}>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="title">Titel *</label>
          <input id="title" name="title" required className={input} placeholder="z.B. Satzung (Stand 2026)" />
        </div>
        <div>
          <label className={label} htmlFor="category">Kategorie</label>
          <select id="category" name="category" className={input}>
            {publicCategoryOptions().map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="newCategory">Neue Kategorie</label>
          <input id="newCategory" name="newCategory" className={input} placeholder="z.B. Rundschreiben" />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" value="1" /> Öffentlich
          </label>
          <button className={btnPrimary}>Hochladen</button>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Datei *</label>
          <FileDropField
            required
            accept="application/pdf,image/jpeg,image/png,image/webp,.docx,.xlsx"
            label="Datei hierher ziehen oder klicken"
            hint="PDF, JPG, PNG, WebP, DOCX oder XLSX, höchstens 15 MB"
          />
        </div>
      </form>

      <div className={card}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Titel</th>
              <th className={th}>Kategorie</th>
              <th className={th}>Sichtbarkeit</th>
              <th className={th}>Hochgeladen</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id}>
                <td className={td}>
                  <a href={`/api/dokumente/${doc.id}`} target="_blank" className="font-medium text-green-800 hover:underline">
                    {doc.title}
                  </a>
                  <div className="text-xs text-stone-400">{doc.originalName}</div>
                </td>
                <td className={td}>{publicCategoryLabel(doc.category)}</td>
                <td className={td}>
                  <span className={`${badge} ${doc.isPublic ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}>
                    {doc.isPublic ? "Öffentlich" : "Intern"}
                  </span>
                </td>
                <td className={td}>{formatDate(doc.uploadedAt)}</td>
                <td className={`${td} space-x-3 whitespace-nowrap`}>
                  <form action={toggleDocumentPublic.bind(null, doc.id)} className="inline">
                    <button className="text-xs text-green-700 hover:underline">
                      {doc.isPublic ? "Auf intern stellen" : "Veröffentlichen"}
                    </button>
                  </form>
                  <form action={deleteDocument.bind(null, doc.id)} className="inline">
                    <button className="text-xs text-red-700 hover:underline">Löschen</button>
                  </form>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>Noch keine Dokumente.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
