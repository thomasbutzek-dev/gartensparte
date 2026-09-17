import Link from "next/link";
import { requireUser } from "@/lib/auth";
import SaveButton from "@/components/SaveButton";
import { btn, card } from "@/lib/ui";
import MemberFields from "../MemberFields";
import { createMember } from "../actions";

export default async function NeuesMitgliedPage({ searchParams }: PageProps<"/admin/mitglieder/neu">) {
  await requireUser();
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mitglied anlegen</h1>
      {params.fehler === "eingabe" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Bitte Vor- und Nachname angeben.</p>
      )}
      <form action={createMember} className={`${card} space-y-4`}>
        <MemberFields />
        <div className="flex gap-3">
          <SaveButton>Anlegen</SaveButton>
          <Link href="/admin/mitglieder" className={btn}>Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}
