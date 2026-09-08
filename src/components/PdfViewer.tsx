"use client";

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function PdfViewer({ data }: { data: ArrayBuffer }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    (async () => {
      const document = await getDocument({ data: data.slice(0) }).promise;
      if (cancelled) return;
      host.replaceChildren();
      for (let number = 1; number <= document.numPages; number += 1) {
        const page = await document.getPage(number);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.15 });
        const canvas = window.document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "mb-3 w-full bg-white shadow";
        const context = canvas.getContext("2d");
        if (!context) throw new Error("kein zeichenfeld");
        host.appendChild(canvas);
        await page.render({ canvasContext: context, viewport, canvas }).promise;
      }
    })().catch(() => {
      if (!cancelled) setError("Das PDF konnte nicht angezeigt werden.");
    });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [data]);

  if (error) {
    return <p className="rounded-md bg-white px-4 py-3 text-sm text-red-800">{error}</p>;
  }

  return <div ref={hostRef} className="h-[80vh] w-full max-w-5xl overflow-auto rounded-md bg-stone-300 p-3" />;
}
