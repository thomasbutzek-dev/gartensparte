"use client";

import { useState } from "react";

export default function PublicMap({
  embedUrl,
  pageUrl,
  previewSrc = "/api/karte-vorschau",
}: {
  embedUrl: string;
  pageUrl: string;
  previewSrc?: string;
}) {
  const [open, setOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  if (open) {
    return (
      <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
        <iframe
          title="Lage auf OpenStreetMap"
          src={embedUrl}
          className="h-64 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <a href={pageUrl} target="_blank" rel="noreferrer" className="block bg-stone-50 px-3 py-2 text-xs text-green-700 hover:underline">
          Größere Karte bei OpenStreetMap
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
      <button type="button" onClick={() => setOpen(true)} className="group relative block w-full text-left">
        {!previewFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Lage der Anlage"
            className="h-64 w-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <span className="flex h-44 items-center justify-center bg-stone-100 text-sm text-stone-600">
            Karte von OpenStreetMap anzeigen
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-sparte-deep/80 px-3 py-2 text-sm text-white">
          Karte bewegen und vergrößern
        </span>
      </button>
    </div>
  );
}
