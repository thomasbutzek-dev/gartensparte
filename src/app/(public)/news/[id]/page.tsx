export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { formatDate } from "@/lib/format";
import { badge } from "@/lib/ui";
import RichText from "@/components/RichText";
import SiteContainer from "@/components/SiteContainer";

export default async function NewsDetailPage({ params }: PageProps<"/news/[id]">) {
  const { id } = await params;
  const item = db
    .select()
    .from(tables.news)
    .where(and(eq(tables.news.id, Number(id)), eq(tables.news.status, "veroeffentlicht")))
    .get();
  if (!item) notFound();

  return (
    <SiteContainer narrow className="py-10">
    <article className="space-y-4">
      <Link href="/news" className="text-sm text-green-700 hover:underline">
        ← Alle News
      </Link>
      <h1 className="text-2xl font-bold">{item.title}</h1>
      <p className="text-sm text-stone-500">
        {formatDate(item.publishedAt)}
        {item.pinned ? <span className={`${badge} ml-2 bg-amber-100 text-amber-900`}>Oben gehalten</span> : null}
      </p>
      <RichText html={item.body} className="leading-relaxed" />
    </article>
    </SiteContainer>
  );
}
