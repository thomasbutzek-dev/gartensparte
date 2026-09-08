import FileDropField from "@/components/FileDropField";
import LocationEditor from "@/components/LocationEditor";
import RichTextEditor from "@/components/RichTextEditor";
import { requireUser } from "@/lib/auth";
import { hasMapPreviewFile } from "@/lib/map-preview";
import { getSettings } from "@/lib/settings";
import { listBoardMembers, listGalleryImages } from "@/lib/site";
import { btn, btnDanger, btnPrimary, card, input, label } from "@/lib/ui";
import {
  addBoardMember,
  addGalleryImage,
  deleteBoardMember,
  deleteGalleryImage,
  removeHero,
  removeLogo,
  removeSceneImage,
  updateAppearance,
  updateBoardMember,
  updateVereinContact,
  updateGalleryImage,
  uploadHero,
  uploadLogo,
  uploadSceneImage,
} from "./actions";

export default async function WebsitePage({ searchParams }: PageProps<"/admin/website">) {
  await requireUser();
  const params = await searchParams;
  const settings = getSettings();
  const gallery = listGalleryImages();
  const board = listBoardMembers();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Website</h1>
        <p className="mt-1 text-sm text-stone-500">
          Alles, was Besucher auf der öffentlichen Seite sehen. Ohne Bilder bleibt die Startseite schlicht, aber vollständig.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <a href="#verein" className="text-green-700 hover:underline">Adresse</a>
          <a href="#texte" className="text-green-700 hover:underline">Texte</a>
          <a href="#kacheln" className="text-green-700 hover:underline">Kacheln</a>
          <a href="#anfahrt" className="text-green-700 hover:underline">Anfahrt</a>
          <a href="#galerie" className="text-green-700 hover:underline">Galerie</a>
          <a href="#vorstand" className="text-green-700 hover:underline">Vorstand</a>
        </p>
      </div>

      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Gespeichert.</p>}
      {params.fehler === "bild" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Upload fehlgeschlagen. Erlaubt sind JPG, PNG und WebP bis 15 MB.</p>
      )}
      {params.fehler === "name" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte einen Namen angeben.</p>}
      {params.fehler === "datei" && <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine Datei auswählen.</p>}
      {params.fehler === "adresse" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
          Die Adresse wurde nicht gefunden. Bitte Straße und Ort genauer eingeben oder den Punkt auf der Karte setzen.
        </p>
      )}

      <form id="verein" action={updateVereinContact} className={`${card} space-y-4`}>
        <h2 className="text-lg font-semibold">Adresse und Kontakt</h2>
        <p className="text-sm text-stone-500">
          Steht im Fuß der Website, auf der Kontaktseite und im Briefkopf. Bank und Beiträge bleiben unter Einstellungen.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="vereinName">Vereinsname</label>
            <input id="vereinName" name="vereinName" defaultValue={settings.vereinName} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="vorsitzender">Name im Briefkopf</label>
            <input id="vorsitzender" name="vorsitzender" defaultValue={settings.vorsitzender} className={input} placeholder="z.B. 1. Vorsitzende" />
          </div>
          <div>
            <label className={label} htmlFor="vereinStrasse">Straße</label>
            <input id="vereinStrasse" name="vereinStrasse" defaultValue={settings.vereinStrasse} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="vereinOrt">PLZ Ort</label>
            <input id="vereinOrt" name="vereinOrt" defaultValue={settings.vereinOrt} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="vereinEmail">E-Mail</label>
            <input id="vereinEmail" name="vereinEmail" type="email" defaultValue={settings.vereinEmail} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="vereinTelefon">Telefon</label>
            <input id="vereinTelefon" name="vereinTelefon" defaultValue={settings.vereinTelefon} className={input} />
          </div>
        </div>
        <button className={btnPrimary}>Adresse speichern</button>
      </form>

      <section className="grid gap-6 md:grid-cols-2">
        <div className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">Logo</h2>
          {settings.logoFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/logo" alt="Aktuelles Logo" className="h-20 w-auto rounded bg-stone-50 object-contain p-2" />
          ) : (
            <p className="text-sm text-stone-500">Noch kein Logo. Im Kopf erscheint dann der Vereinsname.</p>
          )}
          <form action={uploadLogo}>
            <FileDropField
              required
              autoSubmit
              label={settings.logoFile ? "Neues Logo hierher ziehen" : "Logo hierher ziehen oder klicken"}
            />
          </form>
          {settings.logoFile ? (
            <form action={removeLogo}>
              <button className={btnDanger}>Logo entfernen</button>
            </form>
          ) : null}
        </div>

        <div className={`${card} space-y-3`}>
          <h2 className="text-lg font-semibold">Titelbild (Startseite)</h2>
          {settings.heroFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/hero" alt="Aktuelles Titelbild" className="h-28 w-full rounded object-cover" />
          ) : (
            <p className="text-sm text-stone-500">Ohne Foto erscheint ein grüner Hintergrund.</p>
          )}
          <form action={uploadHero}>
            <FileDropField
              required
              autoSubmit
              label={settings.heroFile ? "Neues Titelbild hierher ziehen" : "Titelbild hierher ziehen oder klicken"}
            />
          </form>
          {settings.heroFile ? (
            <form action={removeHero}>
              <button className={btnDanger}>Titelbild entfernen</button>
            </form>
          ) : null}
        </div>
      </section>

      <form id="texte" action={updateAppearance} className={`${card} space-y-4`}>
        <h2 className="text-lg font-semibold">Texte auf der Startseite</h2>
        <div>
          <label className={label} htmlFor="slogan">Untertitel / Slogan</label>
          <input id="slogan" name="slogan" defaultValue={settings.slogan} className={input} maxLength={300} />
        </div>
        <div>
          <label className={label} htmlFor="startText">Begrüßungstext</label>
          <RichTextEditor id="startText" name="startText" defaultValue={settings.startText} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="foundingYear">Gründungsjahr (optional)</label>
            <input id="foundingYear" name="foundingYear" defaultValue={settings.foundingYear} className={input} placeholder="z.B. 1968" />
          </div>
          <div>
            <label className={label} htmlFor="areaLabel">Fläche (optional)</label>
            <input id="areaLabel" name="areaLabel" defaultValue={settings.areaLabel} className={input} placeholder="z.B. ca. 4 ha" />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="sprechzeiten">Sprechzeiten</label>
          <input id="sprechzeiten" name="sprechzeiten" defaultValue={settings.sprechzeiten} className={input} />
          <p className="mt-1 text-xs text-stone-500">Steht im Fuß, beim Vorstand und auf der Kontaktseite.</p>
        </div>
        <div>
          <label className={label} htmlFor="directionsText">Anfahrt / Lage</label>
          <RichTextEditor id="directionsText" name="directionsText" defaultValue={settings.directionsText} />
        </div>
        <div>
          <label className={label} htmlFor="ansprechpartnerText">Zusatztext Vorstand</label>
          <RichTextEditor id="ansprechpartnerText" name="ansprechpartnerText" defaultValue={settings.ansprechpartnerText} />
          <p className="mt-1 text-xs text-stone-500">Nur Zusatz. Sprechzeiten nicht noch einmal eintragen.</p>
        </div>
        <div>
          <label className={label} htmlFor="uebernahmeText">Freie Gärten – Ablauf der Übernahme</label>
          <RichTextEditor id="uebernahmeText" name="uebernahmeText" defaultValue={settings.uebernahmeText} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {([1, 2, 3] as const).map((slot) => (
            <div key={slot}>
              <label className={label} htmlFor={`scene${slot}Title`}>Kachel {slot} – Titel</label>
              <input
                id={`scene${slot}Title`}
                name={`scene${slot}Title`}
                defaultValue={settings[`scene${slot}Title`]}
                className={input}
              />
              <textarea name={`scene${slot}Text`} rows={3} defaultValue={settings[`scene${slot}Text`]} className={`${input} mt-2`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500">
          Adresse, Telefon und E-Mail stehen oben. Freie Gärten zählt das Programm selbst. Leere Kacheln blendet die
          Startseite aus.
        </p>
        <button className={btnPrimary}>Texte speichern</button>
      </form>

      <section id="kacheln" className="grid gap-4 sm:grid-cols-3">
        {([1, 2, 3] as const).map((slot) => {
          const image = settings[`scene${slot}Image`];
          return (
            <div key={slot} className={`${card} space-y-2`}>
              <p className="text-sm font-medium">Hintergrund Kachel {slot}</p>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/kachel/${slot}`} alt="" className="h-24 w-full rounded object-cover" />
              ) : (
                <p className="text-xs text-stone-500">Ohne Foto bleibt die Zeichnung.</p>
              )}
              <form action={uploadSceneImage.bind(null, slot)}>
                <FileDropField required autoSubmit label="Bild hierher ziehen oder klicken" />
              </form>
              {image ? (
                <form action={removeSceneImage.bind(null, slot)}>
                  <button className="text-sm text-red-700 hover:underline">Bild entfernen</button>
                </form>
              ) : null}
            </div>
          );
        })}
      </section>

      <section id="anfahrt" className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Anfahrt auf der Startseite</h2>
        <p className="text-sm text-stone-500">
          OpenStreetMap, ohne Google. Zuerst die Adresse suchen oder den Punkt auf der Karte setzen, dann speichern.
        </p>
        <LocationEditor
          address={settings.mapAddress}
          lat={settings.mapLat}
          lng={settings.mapLng}
          vereinAddress={[settings.vereinStrasse, settings.vereinOrt].filter(Boolean).join(", ")}
          hasPreview={hasMapPreviewFile()}
        />
      </section>

      <section id="galerie" className={`${card} space-y-4`}>
        <h2 className="text-lg font-semibold">Galerie</h2>
        <form action={addGalleryImage} className="space-y-3">
          <FileDropField
            required
            multiple
            autoSubmit
            label="Bilder hierher ziehen – auch mehrere auf einmal"
            hint="JPG, PNG oder WebP. Unterschrift unten gilt für das erste Bild."
          />
          <input id="caption" name="caption" className={input} placeholder="Bildunterschrift (optional)" />
        </form>
        {gallery.length === 0 ? (
          <p className="text-sm text-stone-500">Noch keine Fotos. Auf der Startseite stehen dann Zeichnungen als Platzhalter.</p>
        ) : (
          <ul className="space-y-4">
            {gallery.map((image) => (
              <li key={image.id} className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-[8rem_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/galerie/${image.id}`} alt={image.caption || "Galeriebild"} className="h-24 w-full rounded object-cover" />
                <form action={updateGalleryImage.bind(null, image.id)} className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={label}>Unterschrift</label>
                    <input name="caption" defaultValue={image.caption} className={input} />
                  </div>
                  <div>
                    <label className={label}>Reihenfolge</label>
                    <input name="sortOrder" type="number" defaultValue={image.sortOrder} className={input} />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" name="showOnHome" value="1" defaultChecked={image.showOnHome} />
                    Auf der Startseite zeigen
                  </label>
                  <div className="flex gap-2">
                    <button className={btn}>Speichern</button>
                  </div>
                </form>
                <form action={deleteGalleryImage.bind(null, image.id)} className="sm:col-start-2">
                  <button className="text-sm text-red-700 hover:underline">Bild löschen</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="vorstand" className={`${card} space-y-4`}>
        <h2 className="text-lg font-semibold">Vorstand</h2>
        <p className="text-sm text-stone-500">
          Erscheint auf der Startseite und unter „Vorstand“. Der Zusatztext steht weiter oben bei den Startseitentexten.
        </p>
        <form action={addBoardMember} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="boardName">Name *</label>
            <input id="boardName" name="name" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="boardRole">Funktion</label>
            <input id="boardRole" name="role" className={input} placeholder="z.B. 1. Vorsitzende" />
          </div>
          <div>
            <label className={label} htmlFor="boardEmail">E-Mail</label>
            <input id="boardEmail" name="email" type="email" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="boardPhone">Telefon</label>
            <input id="boardPhone" name="phone" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Foto (optional)</label>
            <FileDropField name="photo" label="Foto hierher ziehen oder klicken" />
          </div>
          <button className={btnPrimary}>Person anlegen</button>
        </form>
        {board.length === 0 ? (
          <p className="text-sm text-stone-500">Noch niemand eingetragen.</p>
        ) : (
          <ul className="space-y-6">
            {board.map((member) => (
              <li key={member.id} className="border-t border-stone-100 pt-4">
                <form action={updateBoardMember.bind(null, member.id)} className="grid gap-3 sm:grid-cols-[6rem_1fr]">
                  {member.photoFile ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/vorstand-foto/${member.id}`} alt="" className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-stone-100 text-sm text-stone-400">
                      Foto
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={label}>Name</label>
                      <input name="name" defaultValue={member.name} required className={input} />
                    </div>
                    <div>
                      <label className={label}>Funktion</label>
                      <input name="role" defaultValue={member.role} className={input} />
                    </div>
                    <div>
                      <label className={label}>E-Mail</label>
                      <input name="email" type="email" defaultValue={member.email} className={input} />
                    </div>
                    <div>
                      <label className={label}>Telefon</label>
                      <input name="phone" defaultValue={member.phone} className={input} />
                    </div>
                    <div>
                      <label className={label}>Reihenfolge</label>
                      <input name="sortOrder" type="number" defaultValue={member.sortOrder} className={input} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={label}>Foto ersetzen</label>
                      <FileDropField name="photo" label="Neues Foto hierher ziehen" />
                    </div>
                    <button className={btnPrimary}>Speichern</button>
                  </div>
                </form>
                <form action={deleteBoardMember.bind(null, member.id)} className="mt-2">
                  <button className="text-sm text-red-700 hover:underline">Person entfernen</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
