"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "@/lib/ui";
import { useDemoMode } from "@/components/DemoProvider";

export default function SaveButton({
  children,
  className = btnPrimary,
  name,
  value,
  disabled,
  pendingLabel = "Wird gespeichert…",
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const demo = useDemoMode();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending || disabled || demo}
      title={demo ? "Im Demo-Modus wird nichts gespeichert." : undefined}
    >
      {demo ? (
        "Nur Anschauen"
      ) : pending ? (
        <>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
