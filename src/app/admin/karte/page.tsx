import { asc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { getMapBackgroundFile, parsePolygon } from "@/lib/map";
import { btn, card, gardenStatusLabels, gardenStatusMapColors } from "@/lib/ui";
import GardenMap from "@/components/GardenMap";
import MapEditor from "./MapEditor";
import { uploadMapBackground } from "./actions";

export default async function KartePage({ searchParams }: PageProps<"/admin/karte">) {
  await requireUser();
  const params = await searchParams;
  const editMode = params.modus === "zeichnen";

  const gardens = db.select().from(tables.gardens).orderBy(asc(tables.gardens.number)).all();
  const tenancies = db
    .select({
      gardenId: tables.tenancies.gardenId,
      firstName: tables.members.firstName,
      lastName: tables.members.lastName,
    })
    .from(tables.tenancies)
    .innerJoin(tables.members, eq(tables.tenancies.memberId, tables.members.id))
    .where(isNull(tables.tenancies.endDate))
    .all();
  const tenantByGarden = new Map(tenancies.map((t) => [t.gardenId, `${t.firstName} ${t.lastName}`]));

  const mapBackground = getMapBackgroundFile();
  const backgroundUrl = mapBackground ? "/api/karte-hintergrund" : null;
  const mapGardens = gardens.map((g) => ({
    id: g.id,
    number: g.number,
    status: g.status,
    sizeSqm: g.sizeSqm,
    polygon: parsePolygon(g.polygon),
    extra: tenantByGarden.get(g.id),
  }));
  const drawnCount = mapGardens.filter((g) => g.polygon).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Karte</h1>
        <div className="flex gap-2">
          <a href={editMode ? "/admin/karte" : "/admin/karte?modus=zeichnen"} className={btn}>
            {editMode ? "Zeichenmodus beenden" : "Parzellen zeichnen"}
          </a>
        </div>
      </div>

      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Lageplan gespeichert.</p>}
      {params.fehler === "datei" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Upload fehlgeschlagen. Erlaubt sind JPG, PNG, WebP, PDF bis 15 MB.</p>
      )}

      <p className="text-sm text-stone-500">
        {drawnCount} von {gardens.length} Parzellen eingezeichnet.
        {" "}Legende:{" "}
        {Object.entries(gardenStatusLabels).map(([value, text]) => (
          <span key={value} className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-stone-400" style={{ backgroundColor: gardenStatusMapColors[value] }} />
            {text}
          </span>
        ))}
      </p>

      {editMode ? (
        <MapEditor gardens={mapGardens} backgroundUrl={backgroundUrl} />
      ) : (
        <GardenMap gardens={mapGardens} backgroundUrl={backgroundUrl} linkBase="/admin/gaerten/" />
      )}

      <section className={`${card} max-w-xl space-y-3`}>
        <h2 className="text-lg font-semibold">Lageplan als Hintergrund</h2>
        <p className="text-sm text-stone-500">
          Scan des Lageplans (JPG/PNG) hochladen – er wird halbtransparent hinter die Parzellen gelegt und dient als Zeichenvorlage.
        </p>
        <form action={uploadMapBackground} className="flex flex-wrap items-center gap-3">
          <input name="file" type="file" required accept="image/*" className="text-sm" />
          <button className={btn}>{mapBackground ? "Lageplan ersetzen" : "Lageplan hochladen"}</button>
        </form>
      </section>
    </div>
  );
}
