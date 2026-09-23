import type { Metadata } from "next";
import { listVisibleNotices } from "@/lib/notices";
import { requireModule } from "@/lib/modules";
import { badge, card } from "@/lib/ui";
import { formatDate } from "@/lib/format";
import SiteContainer from "@/components/SiteContainer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schaukasten" };

export default async function SchaukastenPage() {
  requireModule("schaukasten");
  const items = listVisibleNotices();

  return (
    <SiteContainer narrow className="space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Schaukasten</h1>
        <p className="mt-2 text-stone-600">Aushänge und Angebote aus der Anlage.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Im Schaukasten hängt gerade nichts.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className={card}>
              {item.imageFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/schaukasten/${item.id}`} alt="" className="mb-3 max-h-72 w-full rounded object-cover" />
              ) : null}
              <h2 className="text-lg font-semibold">
                {item.title}
                {item.pinned ? <span className={`${badge} ml-2 bg-amber-100 text-amber-900`}>Oben gehalten</span> : null}
              </h2>
              {item.body ? <p className="mt-2 whitespace-pre-line text-stone-700">{item.body}</p> : null}
              {item.validUntil ? <p className="mt-3 text-sm text-stone-500">Hängt bis {formatDate(item.validUntil)}.</p> : null}
            </li>
          ))}
        </ul>
      )}
    </SiteContainer>
  );
}
