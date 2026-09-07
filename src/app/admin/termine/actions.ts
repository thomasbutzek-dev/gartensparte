"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseDateTimeInput } from "@/lib/format";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: z.string().trim().min(1),
  endDate: z.string().trim().default(""),
  location: z.string().trim().max(200).default(""),
  description: z.string().trim().max(5000).default(""),
  status: z.enum(["entwurf", "veroeffentlicht"]),
});

function parseEvent(formData: FormData) {
  return eventSchema.parse({
    title: formData.get("title"),
    date: parseDateTimeInput(String(formData.get("date") ?? "")) ?? "",
    endDate: parseDateTimeInput(String(formData.get("endDate") ?? "")) ?? "",
    location: formData.get("location"),
    description: formData.get("description"),
    status: formData.get("status") ?? "entwurf",
  });
}

function revalidate() {
  revalidatePath("/admin/termine");
  revalidatePath("/termine");
  revalidatePath("/");
}

export async function createEvent(formData: FormData) {
  await requireUser();
  const data = parseEvent(formData);
  db.insert(tables.events).values({ ...data, endDate: data.endDate || null }).run();
  revalidate();
  redirect("/admin/termine?ok=1");
}

export async function updateEvent(eventId: number, formData: FormData) {
  await requireUser();
  const data = parseEvent(formData);
  db.update(tables.events).set({ ...data, endDate: data.endDate || null }).where(eq(tables.events.id, eventId)).run();
  revalidate();
  redirect("/admin/termine?ok=1");
}

export async function toggleEventStatus(eventId: number) {
  await requireUser();
  const event = db.select().from(tables.events).where(eq(tables.events.id, eventId)).get();
  if (event) {
    db.update(tables.events)
      .set({ status: event.status === "veroeffentlicht" ? "entwurf" : "veroeffentlicht" })
      .where(eq(tables.events.id, eventId))
      .run();
  }
  revalidate();
}

export async function deleteEvent(eventId: number) {
  await requireUser();
  db.delete(tables.events).where(eq(tables.events.id, eventId)).run();
  revalidate();
}
