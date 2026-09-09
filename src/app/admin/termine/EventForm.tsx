import { DateTimeField } from "@/components/DateField";
import RichTextEditor from "@/components/RichTextEditor";
import SaveButton from "@/components/SaveButton";
import { input, label } from "@/lib/ui";

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
          <DateTimeField id="date" name="date" required defaultValue={values.date} />
        </div>
        <div>
          <label className={label} htmlFor="endDate">Ende (optional)</label>
          <DateTimeField id="endDate" name="endDate" defaultValue={values.endDate} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="location">Ort</label>
        <input id="location" name="location" defaultValue={values.location} className={input} placeholder="z.B. Vereinsheim" />
      </div>
      <div>
        <label className={label} htmlFor="description">Beschreibung</label>
        <RichTextEditor id="description" name="description" defaultValue={values.description} />
      </div>
      <div>
        <label className={label} htmlFor="status">Sichtbarkeit</label>
        <select id="status" name="status" defaultValue={values.status ?? "entwurf"} className={input}>
          <option value="entwurf">Entwurf (nur intern)</option>
          <option value="veroeffentlicht">Veröffentlicht (auf der Website)</option>
        </select>
      </div>
      <SaveButton>{submitLabel}</SaveButton>
    </>
  );
}
