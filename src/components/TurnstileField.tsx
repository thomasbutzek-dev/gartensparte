import Script from "next/script";
import { turnstileSiteKey } from "@/lib/turnstile";

/** Cloudflare-Widget an öffentlichen Formularen. Ohne Schlüssel unsichtbar. */
export default function TurnstileField({ action }: { action: string }) {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-action={action} />
    </>
  );
}
