import { DateField } from "@/components/DateField";
import { input, label } from "@/lib/ui";

type MemberValues = {
  firstName?: string;
  lastName?: string;
  street?: string;
  zip?: string;
  city?: string;
  phone?: string;
  email?: string;
  memberSince?: string | null;
  note?: string;
};

export default function MemberFields({ values = {} }: { values?: MemberValues }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="firstName">Vorname *</label>
          <input id="firstName" name="firstName" required defaultValue={values.firstName} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="lastName">Nachname *</label>
          <input id="lastName" name="lastName" required defaultValue={values.lastName} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="street">Straße & Hausnummer</label>
        <input id="street" name="street" defaultValue={values.street} className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div>
          <label className={label} htmlFor="zip">PLZ</label>
          <input id="zip" name="zip" defaultValue={values.zip} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="city">Ort</label>
          <input id="city" name="city" defaultValue={values.city} className={input} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" defaultValue={values.phone} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" defaultValue={values.email} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="memberSince">Mitglied seit</label>
        <DateField id="memberSince" name="memberSince" defaultValue={values.memberSince} />
      </div>
      <div>
        <label className={label} htmlFor="note">Bemerkung</label>
        <textarea id="note" name="note" rows={3} defaultValue={values.note} className={input} />
      </div>
    </>
  );
}
