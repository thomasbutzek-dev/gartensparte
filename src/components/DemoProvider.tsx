"use client";

import { createContext, useContext, useEffect } from "react";

const DemoModeContext = createContext(false);

export function useDemoMode(): boolean {
  return useContext(DemoModeContext);
}

function isGetForm(form: HTMLFormElement): boolean {
  return form.method.toLowerCase() === "get";
}

/** Fängt Speicher-Formulare nur in der Demo-Verwaltung ab. Login bleibt frei. */
export default function DemoProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function onSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.closest("[data-demo-root]")) return;
      if (isGetForm(form) || form.hasAttribute("data-demo-ok")) return;
      event.preventDefault();
      event.stopPropagation();
    }
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  return (
    <div data-demo-root="">
      <DemoModeContext.Provider value={true}>{children}</DemoModeContext.Provider>
    </div>
  );
}
