import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requireModule } from "@/lib/modules";
import SaveButton from "@/components/SaveButton";
import { btn, card, input, label } from "@/lib/ui";
import { loadVerbandNews, verbandFeedSetting, verbandHeading, DEFAULT_VERBAND_TITLE } from "@/lib/verband";
import { saveVerbandFeed } from "./actions";

export default async function VerbandAdminPage({ searchParams }: PageProps<"/admin/verband">) {
  await requireUser();
  requireModule("verband");
  const params = await searchParams;
  const setting = verbandFeedSetting();
  const heading = verbandHeading();
  const items = setting.url ? await loadVerbandNews(setting.url) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verbands-News</h1>
        <p className="mt-1 text-sm text-stone-500">
          Die Website zeigt die neuesten Meldungen dieser Seite. Ohne eigene Adresse gilt der Landesverband Sachsen-Anhalt.
          Leer speichern blendet die Meldungen aus, das Modul bleibt an.
        </p>
      </div>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Quelle gespeichert.</p>}
      {params.fehler === "adresse" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte eine öffentliche http- oder https-Adresse eintragen.</p>
      )}
      <form action={saveVerbandFeed} className={`${card} space-y-4`}>
        <div>
          <label className={label} htmlFor="title">Überschrift auf der Website</label>
          <input id="title" name="title" maxLength={80} defaultValue={heading === DEFAULT_VERBAND_TITLE ? "" : heading} placeholder={DEFAULT_VERBAND_TITLE} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="url">Seite oder RSS-Adresse</label>
          <input id="url" name="url" type="url" defaultValue={setting.isDefault ? "" : setting.url} placeholder={setting.url} className={input} />
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveButton>Speichern</SaveButton>
          <SaveButton name="clear" value="1" className={btn}>Quelle leeren</SaveButton>
        </div>
      </form>
      {!setting.url ? (
        <p className="text-sm text-stone-500">Keine Quelle. Auf der Website steht dann kein Verbandstext.</p>
      ) : items === null ? (
        <p className="text-sm text-stone-500">Die Seite ist gerade nicht erreichbar. Die letzte erfolgreiche Liste bleibt auf der Website, sobald sie einmal geladen wurde.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">Keine Meldungen erkannt. Eine RSS-Adresse oder die News-Seite des Verbands eintragen.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.url} className={`${card} flex gap-3`}>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" referrerPolicy="no-referrer" className="h-20 w-16 shrink-0 rounded bg-stone-100 object-contain" />
              ) : null}
              <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-green-800 hover:underline">
                {item.title}
              </a>
              {item.date ? <p className="mt-1 text-sm text-stone-500">{item.date}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        <Link href="/verband" className="text-green-700 hover:underline">Öffentliche Seite ansehen</Link>
      </p>
    </div>
  );
}
