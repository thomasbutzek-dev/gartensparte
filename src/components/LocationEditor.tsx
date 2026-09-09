"use client";

import { useState } from "react";
import { lookupMapAddress, saveMapPoint } from "@/app/admin/website/actions";
import LocationPicker from "@/components/LocationPicker";
import SaveButton from "@/components/SaveButton";
import { btn, input, label } from "@/lib/ui";

export default function LocationEditor({
  address,
  lat,
  lng,
  vereinAddress,
  hasPreview,
}: {
  address: string;
  lat: number | null;
  lng: number | null;
  vereinAddress: string;
  hasPreview: boolean;
}) {
  const [point, setPoint] = useState({ lat, lng });
  const saved = point.lat !== null && point.lng !== null;

  return (
    <div className="space-y-3">
      <form action={lookupMapAddress} className="space-y-2">
        <label className={label} htmlFor="mapAddress">
          Adresse für die Karte
        </label>
        <input
          id="mapAddress"
          name="mapAddress"
          defaultValue={address || vereinAddress}
          className={input}
          placeholder="Straße, PLZ Ort"
        />
        <SaveButton className={btn}>Adresse auf der Karte suchen</SaveButton>
      </form>
      <p className="text-xs text-stone-500">
        Oder auf die Karte klicken und den Punkt verschieben. Besucher sehen zuerst ein Standbild, die bewegliche Karte
        erst nach einem Klick.
      </p>
      {hasPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/api/karte-vorschau" alt="Vorschau für Besucher" className="h-36 w-full rounded-lg object-cover" />
      ) : null}
      <LocationPicker key={`${lat}-${lng}`} lat={point.lat} lng={point.lng} onChange={(nextLat, nextLng) => setPoint({ lat: nextLat, lng: nextLng })} />
      <form action={saveMapPoint}>
        <input type="hidden" name="mapLat" value={point.lat ?? ""} />
        <input type="hidden" name="mapLng" value={point.lng ?? ""} />
        <SaveButton disabled={!saved}>Diesen Punkt speichern</SaveButton>
      </form>
    </div>
  );
}
