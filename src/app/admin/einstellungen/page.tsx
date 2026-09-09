import { redirect } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import { canSeeSettings, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import SaveButton from "@/components/SaveButton";
import { card, input, label } from "@/lib/ui";
import { updateSettings } from "./actions";

function euroValue(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, useGrouping: false });
}

export default async function EinstellungenPage({ searchParams }: PageProps<"/admin/einstellungen">) {
  const user = await requireUser();
  if (!canSeeSettings(user)) redirect("/admin?fehler=rechte");
  const params = await searchParams;
  const s = getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>
      <p className="text-sm text-stone-500">
        Bank, Beiträge und Impressum. Name, Adresse und Vorstand stehen unter{" "}
        <a href="/admin/website" className="text-green-700 hover:underline">Website</a>.
        Die Anzahl der Gärten stellen Sie unter{" "}
        <a href="/admin/gaerten" className="text-green-700 hover:underline">Gärten</a> ein.
      </p>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Einstellungen gespeichert.</p>}

      <form action={updateSettings} className="space-y-6">
        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Bankverbindung (Rechnungs-Fußzeile)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="bankName">Bank</label>
              <input id="bankName" name="bankName" defaultValue={s.bankName} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="iban">IBAN</label>
              <input id="iban" name="iban" defaultValue={s.iban} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="bic">BIC</label>
              <input id="bic" name="bic" defaultValue={s.bic} className={input} />
            </div>
          </div>
        </section>

        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Beiträge & Sätze</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={label} htmlFor="pachtProQm">Pacht €/m²/Jahr</label>
              <input id="pachtProQm" name="pachtProQm" defaultValue={euroValue(s.pachtCentProQm)} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="mitgliedsbeitrag">Mitgliedsbeitrag €/Jahr</label>
              <input id="mitgliedsbeitrag" name="mitgliedsbeitrag" defaultValue={euroValue(s.mitgliedsbeitragCents)} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="zahlungszielTage">Zahlungsziel (Tage)</label>
              <input id="zahlungszielTage" name="zahlungszielTage" defaultValue={s.zahlungszielTage} className={input} inputMode="numeric" />
            </div>
            <div>
              <label className={label} htmlFor="umlage">Umlage €/Jahr (0 = keine)</label>
              <input id="umlage" name="umlage" defaultValue={euroValue(s.umlageCents)} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="umlageBezeichnung">Bezeichnung der Umlage</label>
              <input id="umlageBezeichnung" name="umlageBezeichnung" defaultValue={s.umlageBezeichnung} className={input} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={label} htmlFor="stromProKwh">Strom €/kWh</label>
              <input id="stromProKwh" name="stromProKwh" defaultValue={euroValue(s.stromCentProKwh)} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="stromGrundgebuehr">Strom-Grundgebühr €/Jahr</label>
              <input id="stromGrundgebuehr" name="stromGrundgebuehr" defaultValue={euroValue(s.stromGrundgebuehrCents)} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="arbeitsstundenSoll">Arbeitsstunden-Soll/Jahr</label>
              <input id="arbeitsstundenSoll" name="arbeitsstundenSoll" defaultValue={s.arbeitsstundenSoll} className={input} inputMode="decimal" />
            </div>
            <div>
              <label className={label} htmlFor="arbeitsstundenSatz">€ je Fehlstunde</label>
              <input id="arbeitsstundenSatz" name="arbeitsstundenSatz" defaultValue={euroValue(s.arbeitsstundenSatzCents)} className={input} inputMode="decimal" />
            </div>
          </div>
        </section>

        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-semibold">Impressum & Datenschutz</h2>
          <p className="text-sm text-stone-500">
            Texte, Fotos und die Vereinsadresse stehen unter{" "}
            <a href="/admin/website" className="text-green-700 hover:underline">Website</a>.
          </p>
          <div>
            <label className={label} htmlFor="impressumText">Impressum</label>
            <RichTextEditor id="impressumText" name="impressumText" defaultValue={s.impressumText} minHeightClass="min-h-40" />
          </div>
          <div>
            <label className={label} htmlFor="datenschutzText">Datenschutzerklärung</label>
            <RichTextEditor id="datenschutzText" name="datenschutzText" defaultValue={s.datenschutzText} minHeightClass="min-h-40" />
          </div>
        </section>

        <SaveButton>Alle Einstellungen speichern</SaveButton>
      </form>
    </div>
  );
}
