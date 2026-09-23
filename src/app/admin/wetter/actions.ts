"use server";

import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/auth";
import { requireModule } from "@/lib/modules";
import { geocodePlace, writeWeatherPlace } from "@/lib/weather-place";

export async function saveWeatherPlace(formData: FormData) {
  await requireWrite();
  requireModule("wetter");
  if (formData.get("clear") === "1") {
    writeWeatherPlace(null);
    redirect("/admin/wetter?ok=1");
  }
  const name = String(formData.get("place") ?? "").trim();
  if (!name) {
    writeWeatherPlace(null);
    redirect("/admin/wetter?ok=1");
  }
  const place = await geocodePlace(name.slice(0, 120));
  if (!place) redirect("/admin/wetter?fehler=ort");
  writeWeatherPlace(place);
  redirect("/admin/wetter?ok=1");
}
