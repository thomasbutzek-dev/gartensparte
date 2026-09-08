export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { publicCategoryGroup } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { card } from "@/lib/ui";
import FilePreview from "@/components/FilePreview";
import SiteContainer from "@/components/SiteContainer";

export const metadata: Metadata = { title: "Dokumente" };

export default function DokumentePage() {
  const docs = db
    .select()
    .from(tables.documents)
    .where(eq(tables.documents.isPublic, true))
    .orderBy(desc(tables.documents.uploadedAt))
    .all();

  const groups = new Map<string, typeof docs>();
  for (const doc of docs) {
    const group = publicCategoryGroup(doc.category);
    groups.set(group, [...(groups.get(group) ?? []), doc]);
  }

  return (
    <SiteContainer className="space-y-8 py-10">
      <h1 className="text-2xl font-bold">Dokumente & Formulare</h1>
      {docs.length === 0 && <p className="text-stone-500">Zurzeit sind keine Dokumente verfügbar.</p>}
      {[...groups.entries()].map(([group, items]) => (
        <section key={group} className={card}>
          <h2 className="mb-3 text-lg font-semibold">{group}</h2>
          <ul className="space-y-2">
            {items.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2">
                <FilePreview
                  href={`/api/dokumente/${doc.id}`}
                  name={doc.title}
                  mimeType={doc.mimeType}
                  meta={formatDate(doc.uploadedAt)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </SiteContainer>
  );
}
