import { asc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { getMapBackgroundFile, parsePolygon } from "@/lib/map";
import { getSettings } from "@/lib/settings";
import { btn, card, gardenStatusLabels, gardenStatusMapColors } from "@/lib/ui";
import FileDropField from "@/components/FileDropField";
import SaveButton from "@/components/SaveButton";
import GardenMap from "@/components/GardenMap";
import MapEditor from "./MapEditor";
import { updatePublicLageplanVisibility, uploadMapBackground } from "./actions";

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

  const settings = getSettings();
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
        <h1 className="text-2xl font-bold">Lageplan</h1>
        <div className="flex gap-2">
          <a href={editMode ? "/admin/karte" : "/admin/karte?modus=zeichnen"} className={btn}>
            {editMode ? "Bearbeiten beenden" : "Parzellen bearbeiten"}
          </a>
        </div>
      </div>

      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Lageplan gespeichert.</p>}
      {params.fehler === "datei" && (
        <p className="rounded-md bg-red-100 px-4 py-3 text-red-800">Upload fehlgeschlagen. Erlaubt sind JPG, PNG, WebP, PDF bis 15 MB.</p>
      )}

      <p className="text-sm text-stone-500">
        Der Plan der Anlage mit den Parzellen. Die Anfahrt für Besucher steht unter Website.
        {settings.showPublicLageplan
          ? " Besucher sehen ihn unter Freie Gärten."
          : " Besucher sehen ihn derzeit nicht."}
      </p>

      <form action={updatePublicLageplanVisibility} className={`${card} max-w-xl space-y-3`}>
        <label className="flex items-start gap-3 text-sm text-stone-800">
          <input
            type="checkbox"
            name="showPublicLageplan"
            value="1"
            defaultChecked={settings.showPublicLageplan}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Lageplan auf der öffentlichen Seite zeigen</span>
            <span className="mt-1 block text-stone-500">
              Ohne Häkchen bleibt er nur hier. Unter Freie Gärten sehen Interessenten dann nur die Liste.
            </span>
          </span>
        </label>
        <SaveButton>Speichern</SaveButton>
      </form>
      <p className="text-sm text-stone-500">
        {drawnCount} von {gardens.length} Parzellen eingezeichnet.
        {editMode ? "" : " Schieflage oder geänderte Grenzen: Parzellen bearbeiten, dann die Eckpunkte ziehen."}
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
        <form action={uploadMapBackground}>
          <FileDropField
            required
            autoSubmit
            accept="image/*"
            label={mapBackground ? "Neuen Lageplan hierher ziehen" : "Lageplan hierher ziehen oder klicken"}
            hint="JPG, PNG oder WebP"
          />
        </form>
      </section>
    </div>
  );
}
