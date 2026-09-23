import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export const DEFAULT_VERBAND_URL = "https://www.gartenfreunde-sachsen-anhalt.de/news";
const SETTINGS_KEY = "verbandFeed";
const cache = new Map<string, { at: number; value: VerbandItem[] }>();
const ttlMs = 60 * 60 * 1000;

export type VerbandItem = { title: string; url: string; date: string; image: string };

const TITLE_KEY = "verbandTitle";
export const DEFAULT_VERBAND_TITLE = "Verbands-News";

const namedEntities: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  auml: "ä",
  Auml: "Ä",
  ouml: "ö",
  Ouml: "Ö",
  uuml: "ü",
  Uuml: "Ü",
  szlig: "ß",
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (all, name: string) => namedEntities[name] ?? all);
}

export function safePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1") return null;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return null;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
  return url;
}

function textOf(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeHtml(match[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "")).trim() : "";
}

function absoluteUrl(href: string, pageUrl: string): string {
  try {
    return new URL(decodeHtml(href), pageUrl).href;
  } catch {
    return "";
  }
}

function previewImage(block: string, pageUrl: string): string {
  const tagged = block.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["']([^"']+)["']/i);
  const img = block.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  const raw = decodeHtml(tagged?.[1] || img?.[1] || "").trim();
  if (!raw || raw.startsWith("data:")) return "";
  const url = absoluteUrl(raw, pageUrl);
  return safePublicUrl(url) ? url : "";
}

function pushItem(items: VerbandItem[], seen: Set<string>, item: VerbandItem) {
  if (!item.title || !item.url || seen.has(item.url) || !safePublicUrl(item.url)) return;
  seen.add(item.url);
  items.push(item);
}

export function parseVerbandFeed(body: string, pageUrl: string): VerbandItem[] {
  const baseTag = body.match(/<base\b[^>]*href=["']([^"']+)["']/i);
  const base = baseTag ? absoluteUrl(baseTag[1], pageUrl) || pageUrl : pageUrl;
  const items: VerbandItem[] = [];
  const seen = new Set<string>();
  const rss = body.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  for (const block of rss) {
    const title = textOf(block, "title");
    const linkTag = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    const linkText = textOf(block, "link");
    const url = absoluteUrl(linkTag?.[1] || linkText, base);
    const date = textOf(block, "pubDate") || textOf(block, "updated") || textOf(block, "published");
    pushItem(items, seen, { title, url, date, image: previewImage(block, base) });
    if (items.length >= 12) return items;
  }
  if (items.length > 0) return items;

  const articles = body.split(/<article\b/i).slice(1);
  for (const block of articles) {
    const link = block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    if (!link) continue;
    const titleAttr = link[0].match(/\btitle=["']([^"']+)["']/i);
    const inner = link[0].includes("</a>") ? "" : block.slice(block.indexOf(link[0]) + link[0].length).match(/^([\s\S]*?)<\/a>/i);
    const title = decodeHtml(titleAttr?.[1] || inner?.[1]?.replace(/<[^>]+>/g, "") || "").trim();
    const url = absoluteUrl(link[1], base);
    const stamp = block.match(/\b(\d{2}\.\d{2}\.\d{4})\b/);
    pushItem(items, seen, { title, url, date: stamp?.[1] ?? "", image: previewImage(block, base) });
    if (items.length >= 12) break;
  }
  return items;
}

export function verbandFeedSetting(): { url: string; isDefault: boolean } {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, SETTINGS_KEY)).get();
  if (!row) return { url: DEFAULT_VERBAND_URL, isDefault: true };
  return { url: row.value.trim(), isDefault: false };
}

export function verbandHeading(): string {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, TITLE_KEY)).get();
  const value = row?.value.trim() ?? "";
  return value || DEFAULT_VERBAND_TITLE;
}

export function setVerbandHeading(title: string): void {
  db.insert(tables.settings)
    .values({ key: TITLE_KEY, value: title })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: title } })
    .run();
}

export function setVerbandFeedUrl(url: string): void {
  db.insert(tables.settings)
    .values({ key: SETTINGS_KEY, value: url })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: url } })
    .run();
  cache.clear();
}

export async function loadVerbandNews(pageUrl: string): Promise<VerbandItem[] | null> {
  const safe = safePublicUrl(pageUrl);
  if (!safe) return [];
  const hit = cache.get(safe.href);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  try {
    const response = await fetch(safe, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      headers: { "user-agent": "Gartensparte" },
    });
    if (!response.ok) return hit?.value ?? null;
    const body = (await response.text()).slice(0, 400_000);
    const items = parseVerbandFeed(body, safe.href);
    cache.set(safe.href, { at: Date.now(), value: items });
    return items;
  } catch {
    return hit?.value ?? null;
  }
}
