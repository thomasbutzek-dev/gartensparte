"use client";

import { useEffect, useState } from "react";

function flagsFromUrl() {
  const search = new URLSearchParams(window.location.search);
  return { ok: search.get("ok"), fehler: search.get("fehler") };
}

export default function SaveNotice({
  ok = null,
  fehler = null,
}: {
  ok?: string | null;
  fehler?: string | null;
}) {
  const [flags, setFlags] = useState({ ok, fehler });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setFlags({ ok, fehler });
    setHidden(false);
  }, [ok, fehler]);

  useEffect(() => {
    function onSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.checkValidity()) return;
      const before = window.location.href;
      setHidden(true);
      const started = Date.now();
      const poll = window.setInterval(() => {
        const href = window.location.href;
        const next = flagsFromUrl();
        const done = href !== before || Date.now() - started > 800;
        if ((done && (next.ok || next.fehler)) || Date.now() - started > 15000) {
          window.clearInterval(poll);
          setFlags(next);
          setHidden(false);
        }
      }, 120);
    }
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  useEffect(() => {
    if (hidden || (!flags.ok && !flags.fehler)) return;
    const timer = window.setTimeout(() => setHidden(true), 6000);
    return () => window.clearTimeout(timer);
  }, [flags.ok, flags.fehler, hidden]);

  if (hidden || (!flags.ok && !flags.fehler)) return null;

  if (flags.fehler) {
    return (
      <div
        role="alert"
        className="fixed inset-x-4 bottom-4 z-50 rounded-lg bg-red-800 px-4 py-3 text-sm font-medium text-white shadow-lg md:inset-x-auto md:bottom-auto md:right-8 md:top-6 md:max-w-md"
      >
        <div className="flex items-start justify-between gap-3">
          <p>Das hat nicht geklappt. Bitte die rote Meldung auf der Seite lesen.</p>
          <button type="button" className="shrink-0 underline" onClick={() => setHidden(true)}>
            Schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 rounded-lg bg-green-800 px-4 py-3 text-sm font-medium text-white shadow-lg md:inset-x-auto md:bottom-auto md:right-8 md:top-6 md:max-w-md"
    >
      <div className="flex items-start justify-between gap-3">
        <p>Gespeichert.</p>
        <button type="button" className="shrink-0 underline" onClick={() => setHidden(true)}>
          Schließen
        </button>
      </div>
    </div>
  );
}
