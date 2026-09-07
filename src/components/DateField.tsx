import { formatDateInput, formatDateTimeInput } from "@/lib/format";
import { input as inputClass } from "@/lib/ui";

type FieldProps = {
  id: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
};

export function DateField({ id, name, defaultValue, required, className }: FieldProps) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="TT.MM.JJJJ"
      pattern="\d{1,2}\.\d{1,2}\.\d{4}"
      title="Datum als TT.MM.JJJJ"
      required={required}
      defaultValue={formatDateInput(defaultValue)}
      className={className ?? inputClass}
    />
  );
}

export function DateTimeField({ id, name, defaultValue, required, className }: FieldProps) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="TT.MM.JJJJ HH:MM"
      pattern="\d{1,2}\.\d{1,2}\.\d{4}(?:[,\s]+\d{1,2}:\d{2})?"
      title="Datum als TT.MM.JJJJ, Uhrzeit als HH:MM"
      required={required}
      defaultValue={formatDateTimeInput(defaultValue)}
      className={className ?? inputClass}
    />
  );
}
