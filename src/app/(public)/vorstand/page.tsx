export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { boardExtraText, getSettings, officeHoursLabel } from "@/lib/settings";
import { listBoardMembers } from "@/lib/site";
import { card } from "@/lib/ui";
import SiteContainer from "@/components/SiteContainer";

export const metadata: Metadata = { title: "Vorstand & Ansprechpartner" };

export default function VorstandPage() {
  const settings = getSettings();
  const board = listBoardMembers();

  return (
    <SiteContainer className="space-y-8 py-10">
      <div>
        <h1 className="text-2xl font-bold">Vorstand & Ansprechpartner</h1>
        {officeHoursLabel(settings) ? <p className="mt-2 text-stone-600">{officeHoursLabel(settings)}</p> : null}
      </div>

      {board.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {board.map((member) => (
            <article key={member.id} className={`${card} flex gap-4`}>
              {member.photoFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/vorstand-foto/${member.id}`} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl font-semibold text-green-800">
                  {member.name.slice(0, 1)}
                </span>
              )}
              <div>
                <h2 className="font-semibold">{member.name}</h2>
                {member.role ? <p className="text-sm text-stone-500">{member.role}</p> : null}
                {member.email ? (
                  <p className="mt-2 text-sm">
                    <a href={`mailto:${member.email}`} className="text-green-700 hover:underline">
                      {member.email}
                    </a>
                  </p>
                ) : null}
                {member.phone ? <p className="text-sm text-stone-600">{member.phone}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {boardExtraText(settings) ? (
        <div className={card}>
          <p className="whitespace-pre-line leading-relaxed">{boardExtraText(settings)}</p>
        </div>
      ) : null}

      <p className="text-sm text-stone-500">
        Am einfachsten erreichen Sie uns über das{" "}
        <Link href="/kontakt" className="text-green-700 hover:underline">
          Kontaktformular
        </Link>
        .
      </p>
    </SiteContainer>
  );
}
