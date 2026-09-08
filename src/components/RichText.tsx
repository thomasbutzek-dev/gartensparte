import { toDisplayHtml } from "@/lib/rich-text";

export default function RichText({
  html,
  className = "",
  clamp = false,
  tone = "plain",
}: {
  html: string;
  className?: string;
  clamp?: boolean;
  tone?: "plain" | "photo";
}) {
  const safe = toDisplayHtml(html);
  if (!safe) return null;
  return (
    <div
      className={`rich-text ${tone === "photo" ? "rich-text-photo" : ""} ${clamp ? "line-clamp-3" : ""} ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
