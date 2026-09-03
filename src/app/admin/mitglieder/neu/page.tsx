import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { btn, btnPrimary, card } from "@/lib/ui";
import MemberFields from "../MemberFields";
import { createMember } from "../actions";

export default async function NeuesMitgliedPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mitglied anlegen</h1>
      <form action={createMember} className={`${card} space-y-4`}>
        <MemberFields />
        <div className="flex gap-3">
          <button className={btnPrimary}>Anlegen</button>
          <Link href="/admin/mitglieder" className={btn}>Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}
