"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PdfViewer from "@/components/PdfViewer";

function isPreviewableImage(mimeType: string, name: string) {
  if (mimeType.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function isPdf(mimeType: string, name: string) {
  return mimeType === "application/pdf" || /\.pdf$/i.test(name);
}

export default function FilePreview({
  href,
  name,
  mimeType,
  meta,
}: {
  href: string;
  name: string;
  mimeType: string;
  meta?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState("");
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const image = isPreviewableImage(mimeType, name);
  const pdf = isPdf(mimeType, name);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      triggerRef.current?.focus();
    };
  }, [open]);

  function close() {
    setOpen(false);
    setError("");
    setPdfData(null);
  }

  async function openPdf() {
    setError("");
    setPdfData(null);
    setOpen(true);
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error("nicht geladen");
      setPdfData(await response.arrayBuffer());
    } catch {
      setError("Das PDF konnte nicht angezeigt werden.");
    }
  }

  if (!image && !pdf) {
    return (
      <span>
        <a href={href} target="_blank" rel="noreferrer" className="font-medium text-green-800 hover:underline">
          {name}
        </a>
        {meta ? <span className="mt-0.5 block text-xs text-stone-400">{meta}</span> : null}
      </span>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (pdf ? openPdf() : setOpen(true))}
        className="flex min-h-11 items-center gap-3 text-left"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={href} alt="" className="h-16 w-16 shrink-0 rounded-md bg-stone-100 object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-600">
            PDF
          </span>
        )}
        <span>
          <span className="block font-medium text-green-800">{name}</span>
          {meta ? <span className="mt-0.5 block text-xs text-stone-400">{meta}</span> : null}
        </span>
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex flex-col bg-black/80"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={close}
            >
              <div className="flex justify-end gap-2 p-3">
                <a
                  href={href}
                  download={name}
                  className="inline-flex min-h-11 items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800"
                  onClick={(event) => event.stopPropagation()}
                >
                  Herunterladen
                </a>
                <button
                  ref={closeRef}
                  type="button"
                  className="min-h-11 rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800"
                  onClick={close}
                >
                  Schließen
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col items-center px-4 pb-6" onClick={(event) => event.stopPropagation()}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={href} alt={name} className="max-h-[80vh] max-w-[90vw] rounded-md object-contain" />
                ) : error ? (
                  <p className="rounded-md bg-white px-4 py-3 text-sm text-red-800">{error}</p>
                ) : pdfData ? (
                  <PdfViewer data={pdfData} />
                ) : (
                  <p className="text-sm text-white">Wird geladen …</p>
                )}
                <p id={titleId} className="mt-3 max-w-[90vw] text-center text-sm text-white">
                  {name}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
