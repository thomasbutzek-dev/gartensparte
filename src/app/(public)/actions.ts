"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, tables } from "@/db";
import { nowIso } from "@/lib/format";

const spamFields = z.object({
  website: z.string().max(0, "Spam erkannt."), // Honeypot: muss leer bleiben
  startedAt: z.coerce.number(),
});

function isSpam(formData: FormData): boolean {
  const parsed = spamFields.safeParse({
    website: String(formData.get("website") ?? ""),
    startedAt: String(formData.get("startedAt") ?? "0"),
  });
  if (!parsed.success) return true;
  // Menschen brauchen länger als 3 Sekunden zum Ausfüllen
  return Date.now() - parsed.data.startedAt < 3000;
}

const inquirySchema = z.object({
  name: z.string().trim().min(1, "Bitte Namen angeben.").max(200),
  email: z.string().trim().max(200),
  subject: z.string().trim().max(200),
  message: z.string().trim().min(1, "Bitte eine Nachricht eingeben.").max(5000),
});

export async function submitInquiry(formData: FormData) {
  if (isSpam(formData)) redirect("/kontakt?ok=1"); // Spam stumm verwerfen
  const parsed = inquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/kontakt?fehler=1");
  db.insert(tables.inquiries)
    .values({ ...parsed.data, createdAt: nowIso() })
    .run();
  redirect("/kontakt?ok=1");
}

const applicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().max(200),
  phone: z.string().trim().max(100),
  desiredSize: z.string().trim().max(100),
  message: z.string().trim().max(5000),
});

export async function submitApplication(formData: FormData) {
  if (isSpam(formData)) redirect("/freie-gaerten?ok=1");
  const parsed = applicationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    desiredSize: formData.get("desiredSize"),
    message: formData.get("message"),
  });
  if (!parsed.success || (!parsed.data.email && !parsed.data.phone)) redirect("/freie-gaerten?fehler=1");
  db.insert(tables.applicants)
    .values({ ...parsed.data, createdAt: nowIso() })
    .run();
  redirect("/freie-gaerten?ok=1");
}
