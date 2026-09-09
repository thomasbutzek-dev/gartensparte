import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import NewsPinnedField from "@/components/NewsPinnedField";
import RichTextEditor from "@/components/RichTextEditor";
import SaveButton from "@/components/SaveButton";
import { btn, card, input, label } from "@/lib/ui";
import { updateNews } from "../actions";

export default async function NewsBearbeitenPage({ params }: PageProps<"/admin/news/[id]">) {
  await requireUser();
  const { id } = await params;
  const item = db.select().from(tables.news).where(eq(tables.news.id, Number(id))).get();
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Meldung bearbeiten</h1>
        <Link href="/admin/news" className={btn}>← Zur Liste</Link>
      </div>
      <form action={updateNews.bind(null, item.id)} className={`${card} space-y-4`}>
        <div>
          <label className={label} htmlFor="title">Titel *</label>
          <input id="title" name="title" required defaultValue={item.title} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="body">Text *</label>
          <RichTextEditor id="body" name="body" defaultValue={item.body} minHeightClass="min-h-48" />
        </div>
        <div>
          <label className={label} htmlFor="status">Sichtbarkeit</label>
          <select id="status" name="status" defaultValue={item.status} className={input}>
            <option value="entwurf">Entwurf (nur intern)</option>
            <option value="veroeffentlicht">Veröffentlicht (auf der Website)</option>
            </select>
          </div>
          <NewsPinnedField defaultChecked={item.pinned} />
          <SaveButton>Speichern</SaveButton>
      </form>
    </div>
  );
}
