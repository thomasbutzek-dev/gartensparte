"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gardenStatusLabel, gardenStatusMapColors } from "@/lib/ui";

export type MapGarden = {
  id: number;
  number: number;
  status: string;
  sizeSqm: number | null;
  polygon: [number, number][] | null;
  /** Zusatzinfo im Tooltip (z.B. Pächtername) – auf der öffentlichen Karte weglassen! */
  extra?: string;
};

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 700;

export function centroid(points: [number, number][]): [number, number] {
  const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const y = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return [x, y];
}

export default function GardenMap({
  gardens,
  backgroundUrl,
  linkBase,
  highlightStatus,
}: {
  gardens: MapGarden[];
  backgroundUrl?: string | null;
  /** Wenn gesetzt, führt ein Klick auf eine Parzelle zu `${linkBase}${id}` */
  linkBase?: string;
  /** Status, der visuell hervorgehoben wird (z.B. "frei" auf der öffentlichen Karte) */
  highlightStatus?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<{ garden: MapGarden; x: number; y: number } | null>(null);
  const drawn = gardens.filter((g): g is MapGarden & { polygon: [number, number][] } => !!g.polygon && g.polygon.length >= 3);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-stone-200 bg-white">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="block h-auto w-full select-none"
        onMouseLeave={() => setHover(null)}
      >
        {backgroundUrl ? (
            <image href={backgroundUrl} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} opacity={0.4} preserveAspectRatio="none" />
        ) : (
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f5f5f4" />
        )}
        {drawn.map((garden) => {
          const [cx, cy] = centroid(garden.polygon);
          const dimmed = highlightStatus ? garden.status !== highlightStatus : false;
          return (
            <g
              key={garden.id}
              className={linkBase ? "cursor-pointer" : undefined}
              onClick={linkBase ? () => router.push(`${linkBase}${garden.id}`) : undefined}
              onMouseMove={(event) => {
                const bounds = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ garden, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
              }}
              onMouseLeave={() => setHover(null)}
            >
              <polygon
                points={garden.polygon.map((p) => p.join(",")).join(" ")}
                fill={gardenStatusMapColors[garden.status] ?? "#d6d3d1"}
                fillOpacity={dimmed ? 0.35 : 0.7}
                stroke="#1e3a8a"
                strokeWidth={dimmed ? 1 : 2}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={14}
                fontWeight={600}
                fill="#292524"
                opacity={dimmed ? 0.4 : 1}
                pointerEvents="none"
              >
                {garden.number}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-stone-900/90 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <p className="font-semibold">Garten {hover.garden.number}</p>
          <p>{gardenStatusLabel(hover.garden.status)}</p>
          {hover.garden.sizeSqm ? <p>{hover.garden.sizeSqm} m²</p> : null}
          {hover.garden.extra ? <p>{hover.garden.extra}</p> : null}
        </div>
      )}
      {drawn.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-stone-500">
          Für die Karte wurden noch keine Parzellen eingezeichnet.
        </p>
      )}
    </div>
  );
}
