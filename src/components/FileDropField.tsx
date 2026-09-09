"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxUploadBytes = 15 * 1024 * 1024;

function looksLikeImage(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

export default function FileDropField({
  name = "file",
  accept = "image/jpeg,image/png,image/webp",
  multiple = false,
  required = false,
  autoSubmit = false,
  compact = false,
  label = "Datei hierher ziehen oder klicken",
  hint = "Fotos werden automatisch verkleinert. JPG, PNG oder WebP, höchstens 15 MB",
}: {
  name?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  autoSubmit?: boolean;
  compact?: boolean;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const { pending } = useFormStatus();
  const imagePending = names.length > 0 && names.every(looksLikeImage);
  const pendingText = compact
    ? "Bitte warten…"
    : imagePending
      ? "Einen Moment bitte. Das Foto wird vorbereitet…"
      : "Einen Moment bitte. Die Datei wird hochgeladen…";

  function take(files: FileList | File[]) {
    const input = inputRef.current;
    if (!input || pending) return;
    const tooBig = Array.from(files).find((file) => file.size > maxUploadBytes);
    if (tooBig) {
      setError("Die Datei ist größer als 15 MB. Bitte ein kleineres Foto wählen oder die Datei verkleinern.");
      setNames([]);
      input.value = "";
      return;
    }
    const picked = Array.from(files).filter((file) => {
      if (accept.includes("image/") && !accept.includes("*") && imageTypes.length) {
        if (accept.split(",").every((part) => part.startsWith("image/"))) {
          return imageTypes.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
        }
      }
      return true;
    });
    const chosen = multiple ? picked : picked.slice(0, 1);
    if (chosen.length === 0) {
      setError("Diese Dateiart ist nicht erlaubt.");
      return;
    }
    setError("");
    const alreadySame =
      input.files?.length === chosen.length && chosen.every((file, index) => input.files?.[index] === file);
    if (!alreadySame) {
      const transfer = new DataTransfer();
      for (const file of chosen) transfer.items.add(file);
      input.files = transfer.files;
    }
    setNames(chosen.map((file) => file.name));
    if (autoSubmit) input.form?.requestSubmit();
  }

  return (
    <label
      aria-busy={pending}
      onDragOver={(event) => {
        event.preventDefault();
        if (!pending) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!pending && event.dataTransfer.files.length) take(event.dataTransfer.files);
      }}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center ${
        compact ? "h-14 w-40 shrink-0 px-2 py-1 text-xs leading-tight" : "min-h-28 px-4 py-6 text-sm"
      } ${
        pending
          ? "cursor-wait border-green-600 bg-green-50"
          : over
            ? "cursor-pointer border-green-600 bg-green-50"
            : "cursor-pointer border-stone-300 bg-stone-50 hover:border-green-600"
      }`}
    >
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        disabled={pending}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;
          if (!files?.length) return;
          take(files);
        }}
      />
      <span className="font-medium text-stone-700">{label}</span>
      {compact ? (
        names.length ? <span className="mt-0.5 w-full truncate text-stone-500">{names.join(", ")}</span> : null
      ) : (
        <span className="mt-1 text-stone-500">{names.length ? names.join(", ") : hint}</span>
      )}
      {error ? <span className="mt-1 text-red-800">{error}</span> : null}
      {pending ? (
        <span className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-green-50/95 px-3 text-green-900">
          <span
            className={`inline-block animate-spin rounded-full border-green-200 border-t-green-700 ${compact ? "h-5 w-5 border-2" : "h-8 w-8 border-4"}`}
            aria-hidden
          />
          <span className="font-medium" aria-live="polite">
            {pendingText}
          </span>
        </span>
      ) : null}
    </label>
  );
}
