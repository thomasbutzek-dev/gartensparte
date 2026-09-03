"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MAP_HEIGHT, MAP_WIDTH, centroid, type MapGarden } from "@/components/GardenMap";
import { btn, btnDanger, btnPrimary, gardenStatusMapColors, input, label } from "@/lib/ui";
import { deletePolygon, savePolygon } from "./actions";

type Point = [number, number];

export default function MapEditor({
  gardens,
  backgroundUrl,
}: {
  gardens: (MapGarden & { tenant?: string })[];
  backgroundUrl: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number>(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const selected = gardens.find((g) => g.id === selectedId) ?? null;
  const withPolygon = gardens.filter(
    (g): g is typeof g & { polygon: Point[] } => !!g.polygon && g.polygon.length >= 3,
  );
  const withoutPolygon = gardens.filter((g) => !g.polygon);

  function toMapCoords(event: React.MouseEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    return [Math.max(0, Math.min(MAP_WIDTH, x)), Math.max(0, Math.min(MAP_HEIGHT, y))];
  }

  function handleMapClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!selected) {
      setMessage("Bitte zuerst unten einen Garten auswählen.");
      return;
    }
    const [x, y] = toMapCoords(event);
    // Klick nahe am ersten Punkt schließt die Fläche
    if (points.length >= 3) {
      const [fx, fy] = points[0];
      if (Math.hypot(x - fx, y - fy) < 12) {
        void save();
        return;
      }
    }
    setPoints((prev) => [...prev, [x, y]]);
    setMessage("");
  }

  async function save() {
    if (!selected || points.length < 3) {
      setMessage("Mindestens 3 Eckpunkte setzen.");
      return;
    }
    const result = await savePolygon(selected.id, points);
    if (result && "error" in result) {
      setMessage(result.error ?? "Fehler beim Speichern.");
      return;
    }
    setPoints([]);
    setSelectedId(0);
    setMessage(`Fläche für Garten ${selected.number} gespeichert.`);
    startTransition(() => router.refresh());
  }

  async function removePolygon() {
    if (!selected) return;
    await deletePolygon(selected.id);
    setPoints([]);
    setMessage(`Fläche von Garten ${selected.number} gelöscht – jetzt neu zeichnen.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={label} htmlFor="gardenSelect">Garten auswählen</label>
          <select
            id="gardenSelect"
            className={`${input} w-64`}
            value={selectedId}
            onChange={(event) => {
              setSelectedId(Number(event.target.value));
              setPoints([]);
              setMessage("");
            }}
          >
            <option value={0}>– Garten wählen –</option>
            {withoutPolygon.length > 0 && (
              <optgroup label="Noch ohne Fläche">
                {withoutPolygon.map((g) => (
                  <option key={g.id} value={g.id}>Garten {g.number}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Bereits eingezeichnet (neu zeichnen)">
              {withPolygon.map((g) => (
                <option key={g.id} value={g.id}>Garten {g.number}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <button type="button" className={btn} disabled={points.length === 0} onClick={() => setPoints((p) => p.slice(0, -1))}>
          Letzten Punkt zurück
        </button>
        <button type="button" className={btn} disabled={points.length === 0} onClick={() => setPoints([])}>
          Verwerfen
        </button>
        <button type="button" className={btnPrimary} disabled={points.length < 3 || pending} onClick={() => void save()}>
          Fläche speichern ({points.length} Punkte)
        </button>
        {selected?.polygon && (
          <button type="button" className={btnDanger} disabled={pending} onClick={() => void removePolygon()}>
            Fläche löschen
          </button>
        )}
      </div>
      {message && <p className="rounded-md bg-stone-100 px-3 py-2 text-sm">{message}</p>}
      <p className="text-sm text-stone-500">
        Eckpunkte der Parzelle nacheinander anklicken. Zum Schließen auf den ersten Punkt klicken oder „Fläche speichern“.
        Korrektur: Fläche löschen und neu zeichnen.
      </p>

      <div className="w-full overflow-hidden rounded-lg border border-stone-200 bg-white">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-auto w-full cursor-crosshair select-none"
          onClick={handleMapClick}
        >
          {backgroundUrl ? (
            <image href={backgroundUrl} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} opacity={0.45} preserveAspectRatio="xMidYMid meet" />
          ) : (
            <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f5f5f4" />
          )}
          {withPolygon.map((garden) => {
            const [cx, cy] = centroid(garden.polygon);
            const isSelected = garden.id === selectedId;
            return (
              <g key={garden.id}>
                <polygon
                  points={garden.polygon.map((p) => p.join(",")).join(" ")}
                  fill={gardenStatusMapColors[garden.status] ?? "#d6d3d1"}
                  fillOpacity={isSelected ? 0.9 : 0.5}
                  stroke={isSelected ? "#1d4ed8" : "#57534e"}
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600} fill="#292524" pointerEvents="none">
                  {garden.number}
                </text>
              </g>
            );
          })}
          {points.length > 0 && (
            <>
              <polyline
                points={points.map((p) => p.join(",")).join(" ")}
                fill={points.length >= 3 ? "#3b82f6" : "none"}
                fillOpacity={0.2}
                stroke="#1d4ed8"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              {points.map(([x, y], index) => (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={index === 0 ? 7 : 4}
                  fill={index === 0 ? "#1d4ed8" : "white"}
                  stroke="#1d4ed8"
                  strokeWidth={2}
                />
              ))}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
