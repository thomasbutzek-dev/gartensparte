import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { getSettings, isPublicLageplanVisible } from "@/lib/settings";
import { euro } from "@/lib/format";
import { getMapBackgroundFile, parsePolygon } from "@/lib/map";
import { btnPrimary, card, input, label, tableClass, td, th } from "@/lib/ui";
import GardenMap from "@/components/GardenMap";
import RichText from "@/components/RichText";
import SiteContainer from "@/components/SiteContainer";
import SpamGuard from "@/components/SpamGuard";
import { submitApplication } from "../actions";

export const metadata: Metadata = { title: "Freie Gärten" };

export default async function FreieGaertenPage({ searchParams }: PageProps<"/freie-gaerten">) {
  const params = await searchParams;
  const settings = getSettings();
  const gardens = db.select().from(tables.gardens).orderBy(asc(tables.gardens.number)).all();
  const existingGardens = gardens.filter((g) => g.status !== "entfaellt");
  const freeGardens = existingGardens.filter((g) => g.status === "frei");
  const mapBackground = getMapBackgroundFile();

  // Öffentliche Karte: bewusst OHNE Personenbezug (kein Pächtername)
  const mapGardens = existingGardens.map((g) => ({
    id: g.id,
    number: g.number,
    status: g.status === "frei" ? "frei" : "verpachtet",
    sizeSqm: g.sizeSqm,
    polygon: parsePolygon(g.polygon),
  }));

  return (
    <SiteContainer className="space-y-8 py-10">
      <h1 className="text-2xl font-bold">Freie Gärten</h1>
      <RichText html={settings.uebernahmeText} className="text-stone-600" />

      {freeGardens.length === 0 ? (
        <p className={card}>
          Zurzeit ist kein Garten frei. Tragen Sie sich gerne unten in die Warteliste ein – wir melden uns in der
          Reihenfolge der Anfragen.
        </p>
      ) : (
        <div className={card}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Garten-Nr.</th>
                <th className={th}>Größe</th>
                <th className={th}>Pacht/Jahr</th>
                <th className={th}>Mitgliedsbeitrag/Jahr</th>
              </tr>
            </thead>
            <tbody>
              {freeGardens.map((g) => (
                <tr key={g.id}>
                  <td className={td}>Garten {g.number}</td>
                  <td className={td}>{g.sizeSqm ? `${g.sizeSqm} m²` : "–"}</td>
                  <td className={td}>{g.sizeSqm ? euro(Math.round(g.sizeSqm * settings.pachtCentProQm)) : "–"}</td>
                  <td className={td}>{euro(settings.mitgliedsbeitragCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPublicLageplanVisible(settings) ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Lageplan</h2>
          <p className="text-sm text-stone-500">Blau markierte Parzellen sind frei.</p>
          <GardenMap
            gardens={mapGardens}
            backgroundUrl={mapBackground ? "/api/karte-hintergrund" : null}
            highlightStatus="frei"
          />
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-2xl space-y-4">
        <h2 className="text-lg font-semibold">Anfrage stellen / Warteliste</h2>
        {params.ok && (
          <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">
            Vielen Dank für Ihre Anfrage! Wir melden uns in der Reihenfolge der Eingänge.
          </p>
        )}
        {params.fehler && (
          <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">
            Bitte geben Sie Ihren Namen und mindestens eine Kontaktmöglichkeit (E-Mail oder Telefon) an.
          </p>
        )}
        <form action={submitApplication} className={`${card} space-y-4`}>
          <SpamGuard />
          <div>
            <label className={label} htmlFor="name">Name *</label>
            <input id="name" name="name" required className={input} autoComplete="name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="email">E-Mail</label>
              <input id="email" name="email" type="email" className={input} autoComplete="email" />
            </div>
            <div>
              <label className={label} htmlFor="phone">Telefon</label>
              <input id="phone" name="phone" className={input} autoComplete="tel" />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="desiredSize">Gewünschte Gartengröße (optional)</label>
            <input id="desiredSize" name="desiredSize" className={input} placeholder="z.B. ca. 300 m²" />
          </div>
          <div>
            <label className={label} htmlFor="message">Nachricht (optional)</label>
            <textarea id="message" name="message" rows={4} className={input} />
          </div>
          <button className={btnPrimary}>Anfrage senden</button>
        </form>
      </section>
    </SiteContainer>
  );
}
