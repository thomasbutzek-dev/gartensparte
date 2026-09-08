export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { listPublishedNews } from "@/lib/site";
import { badge, card } from "@/lib/ui";
import RichText from "@/components/RichText";
import SiteContainer from "@/components/SiteContainer";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  const items = listPublishedNews();

  return (
    <SiteContainer className="space-y-6 py-10">
      <h1 className="text-2xl font-bold">News</h1>
      {items.length === 0 && <p className="text-stone-500">Noch keine Neuigkeiten.</p>}
      {items.map((item) => (
        <article key={item.id} className={card}>
          <h2 className="font-semibold">
            <Link href={`/news/${item.id}`} className="text-green-800 hover:underline">
              {item.title}
            </Link>
            {item.pinned ? <span className={`${badge} ml-2 bg-amber-100 text-amber-900`}>Oben gehalten</span> : null}
          </h2>
          <p className="text-sm text-stone-500">{formatDate(item.publishedAt)}</p>
          <RichText html={item.body} clamp className="mt-2 text-sm" />
        </article>
      ))}
    </SiteContainer>
  );
}
