import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listNotices } from "@/lib/notices";
import { richTextPlain } from "@/lib/rich-text";
import { requireModule } from "@/lib/modules";
import { DateField } from "@/components/DateField";
import RichTextEditor from "@/components/RichTextEditor";
import FileDropField from "@/components/FileDropField";
import SaveButton from "@/components/SaveButton";
import { badge, btn, btnDanger, card, input, label, tableClass, td, th } from "@/lib/ui";
import { createNotice, deleteNotice, setNoticeImage, toggleNotice } from "./actions";

export default async function SchaukastenAdminPage({ searchParams }: PageProps<"/admin/schaukasten">) {
  await requireUser();
  requireModule("schaukasten");
  const params = await searchParams;
  const items = listNotices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schaukasten</h1>
        <p className="mt-1 text-sm text-stone-500">
          Aushänge und Angebote für die Website. Ein Entwurf bleibt hier. Datum leer lassen, wenn der Zettel immer hängen soll.
        </p>
      </div>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}
      {params.fehler === "eingabe" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte einen Titel eintragen.</p>
      )}
      {params.fehler === "zeit" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Das Enddatum liegt vor dem Anfang.</p>
      )}
      {params.fehler === "bild" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Das Bild fehlt oder ist kein JPG, PNG oder WebP bis 15 MB.</p>
      )}
      <form action={createNotice} className={`${card} space-y-4`}>
        <div>
          <label className={label} htmlFor="title">Titel</label>
          <input id="title" name="title" required maxLength={160} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="body">Text</label>
          <RichTextEditor id="body" name="body" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="validFrom">Sichtbar ab</label>
            <DateField id="validFrom" name="validFrom" />
          </div>
          <div>
            <label className={label} htmlFor="validUntil">Sichtbar bis</label>
            <DateField id="validUntil" name="validUntil" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={label} htmlFor="status">Sichtbarkeit</label>
            <select id="status" name="status" className={input} defaultValue="veroeffentlicht">
              <option value="veroeffentlicht">Öffentlich</option>
              <option value="entwurf">Entwurf</option>
            </select>
          </div>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="pinned" value="1" />
            Oben halten
          </label>
        </div>
        <FileDropField name="image" label="Bild hierher ziehen oder klicken" />
        <SaveButton>Aushang anlegen</SaveButton>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Noch keine Aushänge.</p>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Aushang</th>
                <th className={th}>Zeit</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className={td}>
                    <p className="font-medium">{item.title}</p>
                    {item.imageFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/schaukasten/${item.id}`} alt="" className="mt-2 h-16 w-24 rounded object-cover" />
                    ) : null}
                    {richTextPlain(item.body) ? <p className="mt-1 max-w-md text-stone-600">{richTextPlain(item.body)}</p> : null}
                    <form action={setNoticeImage} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <FileDropField compact name="image" label="Bild hierher ziehen" />
                      <SaveButton className={btn}>Bild speichern</SaveButton>
                      {item.imageFile ? <SaveButton name="remove" value="1" className={btn}>Bild weg</SaveButton> : null}
                    </form>
                  </td>
                  <td className={td}>
                    {item.validFrom || item.validUntil
                      ? `${item.validFrom ? formatDate(item.validFrom) : "sofort"} – ${item.validUntil ? formatDate(item.validUntil) : "offen"}`
                      : "immer"}
                  </td>
                  <td className={td}>
                    <span className={`${badge} ${item.status === "veroeffentlicht" ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-700"}`}>
                      {item.status === "veroeffentlicht" ? "Öffentlich" : "Entwurf"}
                    </span>
                    {item.pinned ? <span className={`${badge} ml-2 bg-amber-100 text-amber-900`}>Oben</span> : null}
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-2">
                      <form action={toggleNotice}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="field" value="status" />
                        <SaveButton className={btn}>{item.status === "veroeffentlicht" ? "Verstecken" : "Veröffentlichen"}</SaveButton>
                      </form>
                      <form action={toggleNotice}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="field" value="pinned" />
                        <SaveButton className={btn}>{item.pinned ? "Lösen" : "Oben halten"}</SaveButton>
                      </form>
                      <form action={deleteNotice}>
                        <input type="hidden" name="id" value={item.id} />
                        <SaveButton className={btnDanger}>Löschen</SaveButton>
                      </form>
                    </div>
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
