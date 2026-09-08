import sanitizeHtml from "sanitize-html";

const allowed = {
  allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "a", "h2", "h3"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer", target: "_blank" }),
  },
} satisfies sanitizeHtml.IOptions;

export function sanitizeRichText(value: string): string {
  return sanitizeHtml(value ?? "", allowed).trim();
}

export function looksLikeHtml(value: string): boolean {
  return /<\/?(p|br|strong|em|b|i|u|s|ul|ol|li|a|h2|h3)\b/i.test(value);
}

export function richTextPlain(value: string): string {
  return sanitizeHtml(value ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextEmpty(value: string): boolean {
  return richTextPlain(value).length === 0;
}

export function toEditorHtml(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (looksLikeHtml(raw)) return sanitizeRichText(raw);
  const escaped = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} });
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function toDisplayHtml(value: string): string {
  return toEditorHtml(value);
}

export function readRichText(formData: FormData, name: string, max = 20000): string {
  const clean = sanitizeRichText(String(formData.get(name) ?? "")).slice(0, max);
  return isRichTextEmpty(clean) ? "" : clean;
}
