export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { formatDate } from "@/lib/format";
import { card } from "@/lib/ui";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  const items = db
    .select()
    .from(tables.news)
    .where(eq(tables.news.status, "veroeffentlicht"))
    .orderBy(desc(tables.news.publishedAt))
    .all();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">News</h1>
      {items.length === 0 && <p className="text-stone-500">Noch keine Neuigkeiten.</p>}
      {items.map((item) => (
        <article key={item.id} className={card}>
          <h2 className="font-semibold">
            <Link href={`/news/${item.id}`} className="text-green-800 hover:underline">
              {item.title}
            </Link>
          </h2>
          <p className="text-sm text-stone-500">{formatDate(item.publishedAt)}</p>
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm">{item.body}</p>
        </article>
      ))}
    </div>
  );
}
