import { btnPrimary, input, label } from "@/lib/ui";

type EventValues = {
  title?: string;
  date?: string;
  endDate?: string | null;
  location?: string;
  description?: string;
  status?: string;
};

export default function EventForm({ values = {}, submitLabel }: { values?: EventValues; submitLabel: string }) {
  return (
    <>
      <div>
        <label className={label} htmlFor="title">Titel *</label>
        <input id="title" name="title" required defaultValue={values.title} className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="date">Beginn *</label>
          <input id="date" name="date" type="datetime-local" required defaultValue={values.date} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="endDate">Ende (optional)</label>
          <input id="endDate" name="endDate" type="datetime-local" defaultValue={values.endDate ?? ""} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="location">Ort</label>
        <input id="location" name="location" defaultValue={values.location} className={input} placeholder="z.B. Vereinsheim" />
      </div>
      <div>
        <label className={label} htmlFor="description">Beschreibung</label>
        <textarea id="description" name="description" rows={4} defaultValue={values.description} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="status">Sichtbarkeit</label>
        <select id="status" name="status" defaultValue={values.status ?? "entwurf"} className={input}>
          <option value="entwurf">Entwurf (nur intern)</option>
          <option value="veroeffentlicht">Veröffentlicht (auf der Website)</option>
        </select>
      </div>
      <button className={btnPrimary}>{submitLabel}</button>
    </>
  );
}
