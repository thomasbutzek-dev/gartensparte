"use client";

import { useRef, useState } from "react";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxUploadBytes = 15 * 1024 * 1024;

export default function FileDropField({
  name = "file",
  accept = "image/jpeg,image/png,image/webp",
  multiple = false,
  required = false,
  autoSubmit = false,
  label = "Datei hierher ziehen oder klicken",
  hint = "JPG, PNG oder WebP, höchstens 15 MB",
}: {
  name?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  autoSubmit?: boolean;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState("");

  function take(files: FileList | File[]) {
    const input = inputRef.current;
    if (!input) return;
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
          return imageTypes.includes(file.type);
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
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (event.dataTransfer.files.length) take(event.dataTransfer.files);
      }}
      className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm ${
        over ? "border-green-600 bg-green-50" : "border-stone-300 bg-stone-50 hover:border-green-600"
      }`}
    >
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;
          if (!files?.length) return;
          take(files);
        }}
      />
      <span className="font-medium text-stone-700">{label}</span>
      <span className="mt-1 text-stone-500">{names.length ? names.join(", ") : hint}</span>
      {error ? <span className="mt-2 text-red-800">{error}</span> : null}
    </label>
  );
}
