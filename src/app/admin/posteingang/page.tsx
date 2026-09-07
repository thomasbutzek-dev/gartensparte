import { desc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { card } from "@/lib/ui";
import { deleteInquiry, toggleInquiryRead } from "./actions";

export default async function PosteingangPage() {
  await requireUser();
  const inquiries = db.select().from(tables.inquiries).orderBy(desc(tables.inquiries.createdAt)).all();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nachrichten</h1>
      <p className="text-sm text-stone-500">Was über das Kontaktformular auf der Website reinkommt.</p>
      {inquiries.length === 0 && <p className={card}>Keine Nachrichten.</p>}
      <div className="space-y-4">
        {inquiries.map((inquiry) => (
          <article key={inquiry.id} className={`${card} ${inquiry.isRead ? "opacity-70" : "border-l-4 border-l-green-600"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                {inquiry.subject || "(Kein Betreff)"}
                {!inquiry.isRead && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Neu</span>}
              </h2>
              <span className="text-xs text-stone-400">{formatDateTime(inquiry.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Von: {inquiry.name}
              {inquiry.email && (
                <>
                  {" · "}
                  <a href={`mailto:${inquiry.email}`} className="text-green-700 hover:underline">{inquiry.email}</a>
                </>
              )}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm">{inquiry.message}</p>
            <div className="mt-3 flex gap-4">
              <form action={toggleInquiryRead.bind(null, inquiry.id)}>
                <button className="text-xs text-green-700 hover:underline">
                  {inquiry.isRead ? "Als ungelesen markieren" : "Als gelesen markieren"}
                </button>
              </form>
              <form action={deleteInquiry.bind(null, inquiry.id)}>
                <button className="text-xs text-red-700 hover:underline">Löschen</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
