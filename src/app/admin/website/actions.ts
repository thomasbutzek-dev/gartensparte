"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, tables, uploadsDir } from "@/db";
import { requireWrite } from "@/lib/auth";
import { saveImageUpload } from "@/lib/files";
import { nowIso } from "@/lib/format";
import { geocodeAddress } from "@/lib/geocode";
import { refreshMapPreview } from "@/lib/map-preview";
import { readRichText } from "@/lib/rich-text";
import { getSettings, saveSettings } from "@/lib/settings";
import { listBoardMembers, moveInList } from "@/lib/site";

function text(formData: FormData, key: string, max = 2000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function revalidatePublic() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/website");
  revalidatePath("/icon");
  revalidatePath("/apple-icon");
  revalidatePath("/favicon.ico");
}

export async function updateVereinContact(formData: FormData) {
  await requireWrite();
  const current = getSettings();
  saveSettings({
    ...current,
    vereinName: text(formData, "vereinName", 200) || current.vereinName,
    vereinStrasse: text(formData, "vereinStrasse", 200),
    vereinOrt: text(formData, "vereinOrt", 200),
    vereinEmail: text(formData, "vereinEmail", 200),
    vereinTelefon: text(formData, "vereinTelefon", 80),
    vorsitzender: text(formData, "vorsitzender", 200),
  });
  revalidatePublic();
  redirect("/admin/website?ok=verein");
}

export async function updateAppearance(formData: FormData) {
  await requireWrite();
  const current = getSettings();
  saveSettings({
    ...current,
    slogan: text(formData, "slogan", 300),
    foundingYear: text(formData, "foundingYear", 10),
    areaLabel: text(formData, "areaLabel", 80),
    sprechzeiten: text(formData, "sprechzeiten", 500),
    directionsText: readRichText(formData, "directionsText", 4000),
    startText: readRichText(formData, "startText", 8000) || current.startText,
    ansprechpartnerText: formData.has("ansprechpartnerText")
      ? readRichText(formData, "ansprechpartnerText", 8000)
      : current.ansprechpartnerText,
    uebernahmeText: formData.has("uebernahmeText") ? readRichText(formData, "uebernahmeText", 8000) : current.uebernahmeText,
    scene1Title: formData.has("scene1Title") ? text(formData, "scene1Title", 80) : current.scene1Title,
    scene1Text: formData.has("scene1Text") ? text(formData, "scene1Text", 300) : current.scene1Text,
    scene2Title: formData.has("scene2Title") ? text(formData, "scene2Title", 80) : current.scene2Title,
    scene2Text: formData.has("scene2Text") ? text(formData, "scene2Text", 300) : current.scene2Text,
    scene3Title: formData.has("scene3Title") ? text(formData, "scene3Title", 80) : current.scene3Title,
    scene3Text: formData.has("scene3Text") ? text(formData, "scene3Text", 300) : current.scene3Text,
  });
  revalidatePublic();
  redirect("/admin/website?ok=texte");
}

export async function lookupMapAddress(formData: FormData) {
  await requireWrite();
  const query = text(formData, "mapAddress", 300);
  if (!query) redirect("/admin/website?fehler=adresse");
  const found = await geocodeAddress(query);
  if (!found) redirect("/admin/website?fehler=adresse");
  const current = getSettings();
  saveSettings({
    ...current,
    mapAddress: query,
    mapLat: found.lat,
    mapLng: found.lng,
  });
  await refreshMapPreview(found.lat, found.lng);
  revalidatePublic();
  redirect("/admin/website?ok=karte");
}

export async function saveMapPoint(formData: FormData) {
  await requireWrite();
  const lat = Number(String(formData.get("mapLat") ?? ""));
  const lng = Number(String(formData.get("mapLng") ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) redirect("/admin/website?fehler=adresse");
  const current = getSettings();
  saveSettings({ ...current, mapLat: lat, mapLng: lng });
  await refreshMapPreview(lat, lng);
  revalidatePublic();
  redirect("/admin/website?ok=karte");
}

export async function uploadLogo(formData: FormData) {
  await requireWrite();
  const file = formData.get("file") as File | null;
  if (!file) redirect("/admin/website?fehler=datei");
  const saved = await saveImageUpload(join(uploadsDir, "website"), file, "logo");
  if ("error" in saved) redirect("/admin/website?fehler=bild");
  const current = getSettings();
  if (current.logoFile) {
    await unlink(join(uploadsDir, "website", current.logoFile)).catch(() => {});
  }
  saveSettings({ ...current, logoFile: saved.fileName });
  revalidatePublic();
  redirect("/admin/website?ok=logo");
}

export async function removeLogo() {
  await requireWrite();
  const current = getSettings();
  if (current.logoFile) {
    await unlink(join(uploadsDir, "website", current.logoFile)).catch(() => {});
  }
  saveSettings({ ...current, logoFile: "" });
  revalidatePublic();
  redirect("/admin/website?ok=logo");
}

export async function uploadHero(formData: FormData) {
  await requireWrite();
  const file = formData.get("file") as File | null;
  if (!file) redirect("/admin/website?fehler=datei");
  const saved = await saveImageUpload(join(uploadsDir, "website"), file, "hero");
  if ("error" in saved) redirect("/admin/website?fehler=bild");
  const current = getSettings();
  if (current.heroFile) {
    await unlink(join(uploadsDir, "website", current.heroFile)).catch(() => {});
  }
  saveSettings({ ...current, heroFile: saved.fileName });
  revalidatePublic();
  redirect("/admin/website?ok=hero");
}

const sceneImageKeys = ["scene1Image", "scene2Image", "scene3Image"] as const;

export async function uploadSceneImage(slot: number, formData: FormData) {
  await requireWrite();
  const key = sceneImageKeys[slot - 1];
  if (!key) redirect("/admin/website");
  const file = formData.get("file") as File | null;
  if (!file) redirect("/admin/website?fehler=datei");
  const saved = await saveImageUpload(join(uploadsDir, "website"), file, "card");
  if ("error" in saved) redirect("/admin/website?fehler=bild");
  const current = getSettings();
  if (current[key]) {
    await unlink(join(uploadsDir, "website", current[key])).catch(() => {});
  }
  saveSettings({ ...current, [key]: saved.fileName });
  revalidatePublic();
  redirect("/admin/website?ok=kachel");
}

export async function removeSceneImage(slot: number) {
  await requireWrite();
  const key = sceneImageKeys[slot - 1];
  if (!key) redirect("/admin/website");
  const current = getSettings();
  if (current[key]) {
    await unlink(join(uploadsDir, "website", current[key])).catch(() => {});
  }
  saveSettings({ ...current, [key]: "" });
  revalidatePublic();
  redirect("/admin/website?ok=kachel");
}

export async function removeHero() {
  await requireWrite();
  const current = getSettings();
  if (current.heroFile) {
    await unlink(join(uploadsDir, "website", current.heroFile)).catch(() => {});
  }
  saveSettings({ ...current, heroFile: "" });
  revalidatePublic();
  redirect("/admin/website?ok=hero");
}

export async function addGalleryImage(formData: FormData) {
  await requireWrite();
  const files = formData.getAll("file").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) redirect("/admin/website?fehler=datei");
  const existing = db.select().from(tables.galleryImages).all();
  let nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0);
  const caption = text(formData, "caption", 200);
  let failed = false;
  for (const [index, file] of files.entries()) {
    const saved = await saveImageUpload(join(uploadsDir, "galerie"), file, "card");
    if ("error" in saved) {
      failed = true;
      continue;
    }
    nextOrder += 1;
    db.insert(tables.galleryImages)
      .values({
        fileName: saved.fileName,
        caption: index === 0 ? caption : "",
        sortOrder: nextOrder,
        showOnHome: true,
        uploadedAt: nowIso(),
      })
      .run();
  }
  revalidatePublic();
  redirect(failed && files.length === 1 ? "/admin/website?fehler=bild" : "/admin/website?ok=galerie");
}

export async function updateGalleryImage(imageId: number, formData: FormData) {
  await requireWrite();
  db.update(tables.galleryImages)
    .set({
      caption: text(formData, "caption", 200),
      sortOrder: Number(formData.get("sortOrder") || 0) || 0,
      showOnHome: formData.get("showOnHome") === "1",
    })
    .where(eq(tables.galleryImages.id, imageId))
    .run();
  revalidatePublic();
  redirect("/admin/website?ok=galerie");
}

export async function deleteGalleryImage(imageId: number) {
  await requireWrite();
  const image = db.select().from(tables.galleryImages).where(eq(tables.galleryImages.id, imageId)).get();
  if (image) {
    db.delete(tables.galleryImages).where(eq(tables.galleryImages.id, imageId)).run();
    await unlink(join(uploadsDir, "galerie", image.fileName)).catch(() => {});
  }
  revalidatePublic();
  redirect("/admin/website?ok=galerie");
}

export async function addBoardMember(formData: FormData) {
  await requireWrite();
  const name = text(formData, "name", 120);
  if (!name) redirect("/admin/website?fehler=name#vorstand");
  const existing = db.select().from(tables.boardMembers).all();
  const maxOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0);
  let photoFile: string | null = null;
  const file = formData.get("photo") as File | null;
  if (file && file.size > 0) {
    const saved = await saveImageUpload(join(uploadsDir, "vorstand"), file, "card");
    if ("error" in saved) redirect("/admin/website?fehler=bild#vorstand");
    photoFile = saved.fileName;
  }
  db.insert(tables.boardMembers)
    .values({
      name,
      role: text(formData, "role", 120),
      email: text(formData, "email", 200),
      phone: text(formData, "phone", 80),
      photoFile,
      sortOrder: maxOrder + 1,
    })
    .run();
  revalidatePublic();
  redirect("/admin/website?ok=vorstand#vorstand");
}

export async function updateBoardMember(memberId: number, formData: FormData) {
  await requireWrite();
  const name = text(formData, "name", 120);
  if (!name) redirect("/admin/website?fehler=name#vorstand");
  const current = db.select().from(tables.boardMembers).where(eq(tables.boardMembers.id, memberId)).get();
  if (!current) redirect("/admin/website");
  let photoFile = current.photoFile;
  const file = formData.get("photo") as File | null;
  if (file && file.size > 0) {
    const saved = await saveImageUpload(join(uploadsDir, "vorstand"), file, "card");
    if ("error" in saved) redirect("/admin/website?fehler=bild#vorstand");
    if (current.photoFile) {
      await unlink(join(uploadsDir, "vorstand", current.photoFile)).catch(() => {});
    }
    photoFile = saved.fileName;
  }
  db.update(tables.boardMembers)
    .set({
      name,
      role: text(formData, "role", 120),
      email: text(formData, "email", 200),
      phone: text(formData, "phone", 80),
      photoFile,
    })
    .where(eq(tables.boardMembers.id, memberId))
    .run();
  revalidatePublic();
  redirect("/admin/website?ok=vorstand#vorstand");
}

export async function moveBoardMember(memberId: number, direction: "up" | "down") {
  await requireWrite();
  const next = moveInList(listBoardMembers(), memberId, direction);
  if (next) {
    for (const [index, member] of next.entries()) {
      db.update(tables.boardMembers)
        .set({ sortOrder: index + 1 })
        .where(eq(tables.boardMembers.id, member.id))
        .run();
    }
  }
  revalidatePublic();
  redirect("/admin/website?ok=vorstand#vorstand");
}

export async function deleteBoardMember(memberId: number) {
  await requireWrite();
  const current = db.select().from(tables.boardMembers).where(eq(tables.boardMembers.id, memberId)).get();
  if (current) {
    db.delete(tables.boardMembers).where(eq(tables.boardMembers.id, memberId)).run();
    if (current.photoFile) {
      await unlink(join(uploadsDir, "vorstand", current.photoFile)).catch(() => {});
    }
  }
  revalidatePublic();
  redirect("/admin/website?ok=vorstand#vorstand");
}
