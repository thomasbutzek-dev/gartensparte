import FileDropField from "@/components/FileDropField";
import GardenMerkmaleFields from "@/components/GardenMerkmaleFields";
import Link from "next/link";
import { gardenCategoryLabel, gardenCategoryOptions } from "@/lib/categories";
import { gardenAttributeLabel, parseGardenAttributes } from "@/lib/garden-attributes";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser, canManageMoney } from "@/lib/auth";
import { DateField } from "@/components/DateField";
import { euro, formatDate, today } from "@/lib/format";
import { badge, btn, btnDanger, btnPrimary, card, gardenStatusColors, gardenStatusLabel, gardenStatusLabels, input, label, tableClass, td, th } from "@/lib/ui";
import {
  addGardenNote,
  changeTenant,
  deleteGarden,
  deleteGardenDocument,
  deleteGardenNote,
  endTenancy,
  updateGarden,
  uploadGardenDocument,
} from "../actions";

export default async function GartenAktePage({ params, searchParams }: PageProps<"/admin/gaerten/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const garden = db.select().from(tables.gardens).where(eq(tables.gardens.id, Number(id))).get();
  if (!garden) notFound();

  const history = db
    .select({
      id: tables.tenancies.id,
      startDate: tables.tenancies.startDate,
      endDate: tables.tenancies.endDate,
      memberId: tables.members.id,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
    })
    .from(tables.tenancies)
    .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
    .where(eq(tables.tenancies.gardenId, garden.id))
    .orderBy(desc(tables.tenancies.startDate))
    .all();
  const currentTenancy = history.find((t) => !t.endDate) ?? null;

  const activeMembers = db
    .select()
    .from(tables.members)
    .where(eq(tables.members.status, "aktiv"))
    .orderBy(asc(tables.members.lastName), asc(tables.members.firstName))
    .all();

  const documents = db
    .select()
    .from(tables.gardenDocuments)
    .where(eq(tables.gardenDocuments.gardenId, garden.id))
    .orderBy(desc(tables.gardenDocuments.uploadedAt))
    .all();

  const notes = db
    .select()
    .from(tables.gardenNotes)
    .where(eq(tables.gardenNotes.gardenId, garden.id))
    .orderBy(desc(tables.gardenNotes.date), desc(tables.gardenNotes.id))
    .all();

  const readings = db
    .select()
    .from(tables.meterReadings)
    .where(eq(tables.meterReadings.gardenId, garden.id))
    .orderBy(desc(tables.meterReadings.date), desc(tables.meterReadings.id))
    .limit(5)
    .all();

  const gardenPayments = canManageMoney(user)
    ? db
        .select()
        .from(tables.payments)
        .where(eq(tables.payments.gardenId, garden.id))
        .orderBy(desc(tables.payments.year))
        .limit(10)
        .all()
    : [];

  const letters = db
    .select()
    .from(tables.letters)
    .where(eq(tables.letters.gardenId, garden.id))
    .orderBy(desc(tables.letters.createdAt))
    .all();

  const updateAction = updateGarden.bind(null, garden.id);
  const tenantAction = changeTenant.bind(null, garden.id);
  const endAction = endTenancy.bind(null, garden.id);
  const noteAction = addGardenNote.bind(null, garden.id);
  const uploadAction = uploadGardenDocument.bind(null, garden.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Garten {garden.number}{" "}
          <span className={`${badge} ${gardenStatusColors[garden.status] ?? "bg-stone-100 text-stone-700"} align-middle`}>
            {gardenStatusLabel(garden.status)}
          </span>
          {parseGardenAttributes(garden.attributes).map((value) => (
            <span key={value} className={`${badge} ml-1 bg-stone-100 text-stone-700 align-middle`}>
              {gardenAttributeLabel(value)}
            </span>
          ))}
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/gaerten" className={btn}>← Zur Liste</Link>
          <Link href={`/admin/gaerten/erfassen?nr=${garden.number}`} className={btn}>Schnellerfassung</Link>
        </div>
      </div>

      {query.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}
      {query.fehler === "nummer" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine ganze Nummer zwischen 1 und 9999 eingeben.</p>
      )}
      {query.fehler === "vergeben" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Diese Nummer ist schon einem anderen Garten zugeordnet.</p>
      )}
      {query.fehler === "pacht" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Solange ein Pächter eingetragen ist, kann die Nummer nicht auf „Nicht vergeben“ gestellt werden.
        </p>
      )}
      {query.fehler === "pacht-loeschen" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Solange ein Pächter eingetragen ist, kann die Nummer nicht gelöscht werden. Zuerst das Pachtverhältnis beenden.
        </p>
      )}
      {query.fehler === "bestaetigung" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Zum Löschen das Kästchen ankreuzen.
        </p>
      )}
      {query.fehler === "datei" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Upload fehlgeschlagen. Erlaubt sind PDF, JPG, PNG, WebP, DOCX, XLSX bis 15 MB.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stammdaten */}
        <form action={updateAction} className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Stammdaten</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="number">Garten-Nr.</label>
              <input id="number" name="number" defaultValue={garden.number} required className={input} inputMode="numeric" />
            </div>
            <div>
              <label className={label} htmlFor="sizeSqm">Größe (m²)</label>
              <input id="sizeSqm" name="sizeSqm" defaultValue={garden.sizeSqm ?? ""} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={garden.status} className={input}>
                {Object.entries(gardenStatusLabels).map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-500">„Nicht vergeben“ = diese Nummer gibt es in der Anlage nicht.</p>
            </div>
            <GardenMerkmaleFields selected={parseGardenAttributes(garden.attributes)} />
          </div>
          <div>
            <label className={label} htmlFor="meterNumber">Stromzähler-Nr.</label>
            <input id="meterNumber" name="meterNumber" defaultValue={garden.meterNumber} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="note">Bemerkung</label>
            <textarea id="note" name="note" rows={3} defaultValue={garden.note} className={input} />
          </div>
          <button className={btnPrimary}>Speichern</button>
        </form>

        {/* Pächter */}
        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Pächter</h2>
          {currentTenancy ? (
            <div className="space-y-3">
              <p>
                Aktuell:{" "}
                <Link href={`/admin/mitglieder/${currentTenancy.memberId}`} className="font-medium text-green-800 hover:underline">
                  {currentTenancy.firstName} {currentTenancy.lastName}
                </Link>{" "}
                <span className="text-sm text-stone-500">seit {formatDate(currentTenancy.startDate)}</span>
              </p>
              <form action={endAction} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className={label} htmlFor="endDate">Pachtende</label>
                  <DateField id="endDate" name="endDate" defaultValue={today()} />
                </div>
                <button className={btn}>Pachtverhältnis beenden</button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Kein aktueller Pächter.</p>
          )}
          <form action={tenantAction} className="space-y-3 border-t border-stone-100 pt-3">
            <p className="text-sm font-medium">{currentTenancy ? "Pächterwechsel" : "Pächter zuordnen"}</p>
            <div>
              <label className={label} htmlFor="memberId">Mitglied</label>
              <select id="memberId" name="memberId" required className={input}>
                <option value="">Bitte wählen…</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="startDate">Pachtbeginn</label>
              <DateField id="startDate" name="startDate" defaultValue={today()} required />
            </div>
            <button className={btnPrimary}>{currentTenancy ? "Wechsel durchführen" : "Zuordnen"}</button>
          </form>
          {history.length > 0 && (
            <div className="border-t border-stone-100 pt-3">
              <p className="mb-2 text-sm font-medium">Historie</p>
              <ul className="space-y-1 text-sm text-stone-600">
                {history.map((t) => (
                  <li key={t.id}>
                    {t.lastName}, {t.firstName}: {formatDate(t.startDate)} – {t.endDate ? formatDate(t.endDate) : "heute"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Dokumente */}
        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Dokumente</h2>
          <ul className="space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <a href={`/api/garten-dokumente/${doc.id}`} target="_blank" className="text-green-800 hover:underline">
                    {doc.originalName}
                  </a>{" "}
                  <span className="text-xs text-stone-400">
                    {gardenCategoryLabel(doc.category)} · {formatDate(doc.uploadedAt)}
                  </span>
                </span>
                <form action={deleteGardenDocument.bind(null, doc.id, garden.id)}>
                  <button className="text-xs text-red-700 hover:underline">Löschen</button>
                </form>
              </li>
            ))}
            {documents.length === 0 && <li className="text-stone-500">Noch keine Dokumente.</li>}
          </ul>
          <form action={uploadAction} className="space-y-3 border-t border-stone-100 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>Datei</label>
                <FileDropField
                  required
                  accept="application/pdf,image/jpeg,image/png,image/webp,.docx,.xlsx"
                  label="Datei hierher ziehen oder klicken"
                  hint="PDF, Foto oder Office-Datei, höchstens 15 MB"
                />
              </div>
              <div>
                <label className={label} htmlFor="category">Kategorie</label>
                <select id="category" name="category" className={input}>
                  {gardenCategoryOptions().map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="newCategory">Neue Kategorie</label>
                <input id="newCategory" name="newCategory" className={input} placeholder="z.B. Versicherung" />
              </div>
            </div>
            <button className={btn}>Hochladen</button>
          </form>
        </section>

        {/* Chronik */}
        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Chronik</h2>
          <form action={noteAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div>
                <label className={label} htmlFor="date">Datum</label>
                <DateField id="date" name="date" defaultValue={today()} />
              </div>
              <div>
                <label className={label} htmlFor="text">Eintrag</label>
                <input id="text" name="text" required placeholder="z.B. Begehung, Übergabe…" className={input} />
              </div>
            </div>
            <button className={btn}>Eintrag hinzufügen</button>
          </form>
          <ul className="space-y-2 border-t border-stone-100 pt-3 text-sm">
            {notes.map((note) => (
              <li key={note.id} className="flex flex-wrap items-start justify-between gap-2">
                <span>
                  <span className="text-stone-400">{formatDate(note.date)}</span> {note.text}
                </span>
                <form action={deleteGardenNote.bind(null, note.id, garden.id)}>
                  <button className="text-xs text-red-700 hover:underline">Löschen</button>
                </form>
              </li>
            ))}
            {notes.length === 0 && <li className="text-stone-500">Noch keine Einträge.</li>}
          </ul>
        </section>

        {/* Zählerstände */}
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">Letzte Zählerstände</h2>
          {readings.length === 0 && <p className="text-sm text-stone-500">Noch keine Ablesungen.</p>}
          <ul className="space-y-1 text-sm">
            {readings.map((r) => (
              <li key={r.id}>
                {formatDate(r.date)}: <strong>{r.value.toLocaleString("de-DE")} kWh</strong>
                {r.note && <span className="text-stone-400"> · {r.note}</span>}
              </li>
            ))}
          </ul>
          <Link href={`/admin/ablesen?nr=${garden.number}`} className="mt-3 inline-block text-sm text-green-700 hover:underline">
            Zählerstand erfassen →
          </Link>
        </section>

        {/* Zahlungen & Schreiben */}
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold">Zahlungen & Schreiben</h2>
          {canManageMoney(user) && gardenPayments.length > 0 && (
            <table className={`${tableClass} mb-4`}>
              <thead>
                <tr>
                  <th className={th}>Jahr</th>
                  <th className={th}>Posten</th>
                  <th className={th}>Betrag</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {gardenPayments.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>{p.year}</td>
                    <td className={td}>{p.description || p.type}</td>
                    <td className={td}>{euro(p.amountCents)}</td>
                    <td className={td}>{p.paidCents >= p.amountCents ? "bezahlt" : `offen (${euro(p.amountCents - p.paidCents)})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ul className="space-y-1 text-sm">
            {letters.map((letter) => (
              <li key={letter.id}>
                <a href={`/api/briefe/${letter.id}`} target="_blank" className="text-green-800 hover:underline">
                  {letter.subject}
                </a>{" "}
                <span className="text-stone-400">({formatDate(letter.createdAt)})</span>
              </li>
            ))}
            {letters.length === 0 && <li className="text-stone-500">Keine Schreiben zu diesem Garten.</li>}
          </ul>
        </section>
      </div>

      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Nummer löschen</h2>
        {currentTenancy ? (
          <p className="text-sm text-stone-500">
            Solange {currentTenancy.firstName} {currentTenancy.lastName} als Pächter eingetragen ist, bleibt die Nummer.
            Zuerst das Pachtverhältnis beenden.
          </p>
        ) : (
          <>
            <p className="text-sm text-stone-500">
              Die Nummer {garden.number} verschwindet komplett, samt Akte, Chronik und hochgeladenen Dateien.
              Zahlungen und Briefe bleiben beim Mitglied, ohne Gartenbezug.
            </p>
            <form action={deleteGarden.bind(null, garden.id)} className="space-y-3">
              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" name="bestaetigt" value="ja" className="mt-1" />
                Ja, Nummer {garden.number} endgültig löschen
              </label>
              <button className={btnDanger}>Nummer löschen</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
