import "server-only";
import { headers } from "next/headers";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string {
  return process.env.TURNSTILE_SITE_KEY?.trim() || "";
}

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET?.trim() && turnstileSiteKey());
}

function allowedHostnames(): Set<string> {
  const listed = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (listed.length > 0) return new Set(listed);
  if (process.env.NODE_ENV !== "production") return new Set(["localhost", "127.0.0.1"]);
  const site = process.env.SITE_DOMAIN?.trim().toLowerCase();
  return site ? new Set([site]) : new Set();
}

async function clientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
}

/** Prüft das Widget. Ohne Schlüssel (Entwicklung) durchlassen. */
export async function verifyTurnstile(formData: FormData, expectedAction: string): Promise<boolean> {
  if (!turnstileConfigured()) return true;
  const token = String(formData.get("cf-turnstile-response") ?? "");
  const secret = process.env.TURNSTILE_SECRET!.trim();
  const hosts = allowedHostnames();
  if (!token || token.length > 2048 || hosts.size === 0) return false;

  let result: { success?: boolean; action?: string; hostname?: string };
  try {
    const body = new URLSearchParams({ secret, response: token });
    const ip = await clientIp();
    if (ip) body.set("remoteip", ip);
    const response = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body,
    });
    if (!response.ok) return false;
    result = (await response.json()) as { success?: boolean; action?: string; hostname?: string };
  } catch {
    return false;
  }

  const hostname = String(result.hostname ?? "").toLowerCase();
  return Boolean(result.success && result.action === expectedAction && hosts.has(hostname));
}
