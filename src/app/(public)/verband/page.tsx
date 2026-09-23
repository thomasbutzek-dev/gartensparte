import type { Metadata } from "next";
import { requireModule } from "@/lib/modules";
import { card } from "@/lib/ui";
import SiteContainer from "@/components/SiteContainer";
import { loadVerbandNews, verbandFeedSetting, verbandHeading } from "@/lib/verband";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: verbandHeading() };
}

export default async function VerbandPage() {
  requireModule("verband");
  const heading = verbandHeading();
  const setting = verbandFeedSetting();
  const items = setting.url ? await loadVerbandNews(setting.url) : [];

  return (
    <SiteContainer narrow className="space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="mt-2 text-stone-600">Meldungen der hinterlegten Verbandsseite. Der Link führt dorthin.</p>
      </div>
      {!setting.url ? (
        <p className="text-sm text-stone-500">Es ist noch keine Verbandsseite hinterlegt.</p>
      ) : items === null ? (
        <p className="text-sm text-stone-500">Die Meldungen sind gerade nicht erreichbar.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">Zurzeit sind keine Meldungen zu sehen.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.url} className={`${card} flex gap-3`}>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" referrerPolicy="no-referrer" className="h-24 w-20 shrink-0 rounded bg-stone-100 object-contain" />
              ) : null}
              <div>
              <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-green-800 hover:underline">
                {item.title}
              </a>
              {item.date ? <p className="mt-1 text-sm text-stone-500">{item.date}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SiteContainer>
  );
}
