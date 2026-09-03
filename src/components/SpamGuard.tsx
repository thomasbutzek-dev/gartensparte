"use client";

import { useEffect, useRef } from "react";

/** Honeypot + Zeitstempel gegen Spam-Bots (unsichtbar für Menschen). */
export default function SpamGuard() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.value = String(Date.now());
  }, []);
  return (
    <>
      <input ref={ref} type="hidden" name="startedAt" defaultValue="0" />
      <label className="hidden" aria-hidden="true">
        Bitte leer lassen
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </>
  );
}
