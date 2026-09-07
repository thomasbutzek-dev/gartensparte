"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
};

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let map: import("leaflet").Map | undefined;
    let marker: import("leaflet").CircleMarker | undefined;
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !element) return;

      const start: [number, number] = lat !== null && lng !== null ? [lat, lng] : [51.16, 10.45];
      const zoom = lat !== null && lng !== null ? 16 : 6;
      map = L.map(element, { scrollWheelZoom: false }).setView(start, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const place = (nextLat: number, nextLng: number) => {
        if (!map) return;
        if (marker) marker.setLatLng([nextLat, nextLng]);
        else marker = L.circleMarker([nextLat, nextLng], { radius: 8, color: "#166534", fillColor: "#166534", fillOpacity: 1 }).addTo(map);
        map.setView([nextLat, nextLng], Math.max(map.getZoom(), 16));
      };

      if (lat !== null && lng !== null) place(lat, lng);

      map.on("click", (event) => {
        place(event.latlng.lat, event.latlng.lng);
        onChangeRef.current(event.latlng.lat, event.latlng.lng);
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);

  return <div ref={host} className="h-64 w-full rounded-lg border border-stone-200" />;
}
