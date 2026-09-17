import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { btn, card } from "@/lib/ui";
import EventForm from "../EventForm";
import { updateEvent } from "../actions";

export default async function TerminBearbeitenPage({ params, searchParams }: PageProps<"/admin/termine/[id]">) {
  await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const event = db.select().from(tables.events).where(eq(tables.events.id, Number(id))).get();
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Termin bearbeiten</h1>
        <Link href="/admin/termine" className={btn}>← Zur Liste</Link>
      </div>
      {query.fehler === "eingabe" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Titel und Datum angeben.</p>
      )}
      <form action={updateEvent.bind(null, event.id)} className={`${card} space-y-4`}>
        <EventForm values={event} submitLabel="Speichern" />
      </form>
    </div>
  );
}
