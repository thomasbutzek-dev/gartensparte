"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MAP_HEIGHT, MAP_WIDTH, centroid, type MapGarden } from "@/components/GardenMap";
import { insertIndexOnEdge } from "@/lib/map-geometry";
import { btn, btnDanger, btnPrimary, gardenStatusMapColors } from "@/lib/ui";
import { useDemoMode } from "@/components/DemoProvider";
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
  const demo = useDemoMode();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragged = useRef(false);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [draft, setDraft] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const selected = gardens.find((g) => g.id === selectedId) ?? null;
  const withPolygon = gardens.filter(
    (g): g is typeof g & { polygon: Point[] } => !!g.polygon && g.polygon.length >= 3,
  );
  const withoutPolygon = gardens.filter((g) => !g.polygon || g.polygon.length < 3);

  function toMapCoords(clientX: number, clientY: number): Point {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * MAP_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * MAP_HEIGHT;
    return [Math.max(0, Math.min(MAP_WIDTH, x)), Math.max(0, Math.min(MAP_HEIGHT, y))];
  }

  function selectGarden(id: number) {
    const garden = gardens.find((item) => item.id === id) ?? null;
    setSelectedId(id);
    setDragIndex(null);
    setDirty(false);
    setMessage("");
    if (garden?.polygon && garden.polygon.length >= 3) {
      setPoints(garden.polygon.map((point) => [point[0], point[1]] as Point));
      setDraft(false);
      return;
    }
    setPoints([]);
    setDraft(true);
  }

  function handleMapClick(event: React.MouseEvent<SVGSVGElement>) {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (!selected) {
      setMessage("Bitte zuerst einen Garten wählen oder eine Parzelle anklicken.");
      return;
    }
    const point = toMapCoords(event.clientX, event.clientY);

    if (!draft && points.length >= 3) {
      const insertAt = insertIndexOnEdge(points, point, 14);
      if (insertAt !== null) {
        setPoints((prev) => [...prev.slice(0, insertAt), point, ...prev.slice(insertAt)]);
        setDirty(true);
        setMessage("Punkt auf der Kante ergänzt. Ziehen zum Verschieben, Doppelklick zum Entfernen.");
      }
      return;
    }

    if (points.length >= 3) {
      const [fx, fy] = points[0];
      if (Math.hypot(point[0] - fx, point[1] - fy) < 12) {
        void save();
        return;
      }
    }
    setPoints((prev) => [...prev, point]);
    setDirty(true);
    setMessage("");
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (dragIndex === null) return;
    dragged.current = true;
    const point = toMapCoords(event.clientX, event.clientY);
    setPoints((prev) => prev.map((item, index) => (index === dragIndex ? point : item)));
    setDirty(true);
  }

  function handlePointerUp() {
    setDragIndex(null);
  }

  function startVertexDrag(event: React.PointerEvent<SVGCircleElement>, index: number) {
    event.stopPropagation();
    event.preventDefault();
    dragged.current = false;
    setDragIndex(index);
    svgRef.current?.setPointerCapture(event.pointerId);
  }

  function removeVertex(index: number) {
    if (points.length <= 3) {
      setMessage("Mindestens 3 Eckpunkte müssen bleiben.");
      return;
    }
    setPoints((prev) => prev.filter((_, item) => item !== index));
    setDirty(true);
  }

  async function save() {
    if (demo) {
      setMessage("Im Demo-Modus wird nichts gespeichert.");
      return;
    }
    if (!selected || points.length < 3) {
      setMessage("Mindestens 3 Eckpunkte setzen.");
      return;
    }
    const result = await savePolygon(selected.id, points);
    if (result && "error" in result) {
      setMessage(result.error ?? "Fehler beim Speichern.");
      return;
    }
    setDraft(false);
    setDirty(false);
    setMessage(`Fläche für Garten ${selected.number} gespeichert.`);
    startTransition(() => router.refresh());
  }

  async function removePolygon() {
    if (demo) {
      setMessage("Im Demo-Modus wird nichts gespeichert.");
      return;
    }
    if (!selected) return;
    await deletePolygon(selected.id);
    setPoints([]);
    setDraft(true);
    setDirty(false);
    setMessage(`Fläche von Garten ${selected.number} gelöscht. Jetzt neu zeichnen oder einen anderen Garten wählen.`);
    startTransition(() => router.refresh());
  }

  const canSave = !demo && points.length >= 3 && (draft || dirty) && !pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {draft && (
          <>
            <button type="button" className={btn} disabled={points.length === 0} onClick={() => setPoints((p) => p.slice(0, -1))}>
              Letzten Punkt zurück
            </button>
            <button type="button" className={btn} disabled={points.length === 0} onClick={() => { setPoints([]); setDirty(false); }}>
              Verwerfen
            </button>
          </>
        )}
        {!draft && selected && (
          <button type="button" className={btn} onClick={() => { setPoints([]); setDraft(true); setDirty(false); }}>
            Neu zeichnen
          </button>
        )}
        <button type="button" className={btnPrimary} disabled={!canSave} onClick={() => void save()}>
          Fläche speichern ({points.length} Punkte)
        </button>
        {selected && !draft && selected.polygon && (
        <button type="button" className={btnDanger} disabled={pending || demo} onClick={() => void removePolygon()}>
            Fläche löschen
          </button>
        )}
      </div>
      {message && <p className="rounded-md bg-stone-100 px-3 py-2 text-sm">{message}</p>}
      <p className="text-sm text-stone-500">
        Neue Parzelle: Eckpunkte nacheinander anklicken, dann speichern.
        Vorhandene Parzelle: anklicken, Eckpunkte ziehen. Klick auf eine Kante setzt einen Punkt dazu, Doppelklick auf einen Punkt nimmt ihn weg.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="flex max-h-[min(70vh,46rem)] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
          {withoutPolygon.length > 0 ? (
            <div className="shrink-0 border-b border-stone-200">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Noch ohne Fläche ({withoutPolygon.length})
              </p>
              <ul className="max-h-36 overflow-y-auto text-sm">
                {withoutPolygon.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-1.5 text-left hover:bg-stone-100 ${selectedId === g.id ? "bg-stone-200 font-medium" : ""}`}
                      onClick={() => selectGarden(g.id)}
                    >
                      Garten {g.number}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Eingezeichnet ({withPolygon.length})
            </p>
            {withPolygon.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-stone-500">Noch keine Fläche gespeichert.</p>
            ) : (
              <ul className="text-sm">
                {withPolygon.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-1.5 text-left hover:bg-stone-100 ${selectedId === g.id ? "bg-stone-200 font-medium" : ""}`}
                      onClick={() => selectGarden(g.id)}
                    >
                      Garten {g.number}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-auto w-full cursor-crosshair select-none touch-none"
          onClick={handleMapClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {backgroundUrl ? (
            <image href={backgroundUrl} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} opacity={0.45} preserveAspectRatio="none" />
          ) : (
            <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f5f5f4" />
          )}
          {withPolygon.map((garden) => {
            const [cx, cy] = centroid(garden.polygon);
            const isSelected = garden.id === selectedId;
            return (
              <g key={garden.id} className="cursor-pointer" onClick={(event) => { event.stopPropagation(); selectGarden(garden.id); }}>
                <polygon
                  points={garden.polygon.map((p) => p.join(",")).join(" ")}
                  fill={gardenStatusMapColors[garden.status] ?? "#93c5fd"}
                  fillOpacity={isSelected ? 0.2 : 0.55}
                  stroke={isSelected ? "#1d4ed8" : "#1e3a8a"}
                  strokeWidth={isSelected ? 2.5 : 2}
                />
                {!isSelected ? (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600} fill="#1e3a8a" pointerEvents="none">
                    {garden.number}
                  </text>
                ) : null}
              </g>
            );
          })}
          {points.length > 0 && (
            <>
              <polygon
                points={points.map((p) => p.join(",")).join(" ")}
                fill={points.length >= 3 ? "#3b82f6" : "none"}
                fillOpacity={0.25}
                stroke="#1d4ed8"
                strokeWidth={2}
                strokeDasharray={draft ? "6 3" : undefined}
                pointerEvents="none"
              />
              {points.map(([x, y], index) => (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={index === 0 && draft ? 7 : 6}
                  fill={index === 0 && draft ? "#1d4ed8" : "white"}
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  className={draft ? undefined : "cursor-move"}
                  onPointerDown={(event) => {
                    if (draft) return;
                    startVertexDrag(event, index);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (!draft) removeVertex(index);
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              ))}
              {selected && points.length >= 3 && (
                <text
                  x={centroid(points)[0]}
                  y={centroid(points)[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={13}
                  fontWeight={600}
                  fill="#1e3a8a"
                  pointerEvents="none"
                >
                  {selected.number}
                </text>
              )}
            </>
          )}
        </svg>
      </div>
      </div>
    </div>
  );
}
