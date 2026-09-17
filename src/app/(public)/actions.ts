"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, tables } from "@/db";
import { nowIso } from "@/lib/format";
import { clientFingerprint, consumeFormSlot } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

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

const emailField = z
  .string()
  .trim()
  .max(200)
  .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const inquirySchema = z.object({
  name: z.string().trim().min(1, "Bitte Namen angeben.").max(200),
  email: emailField,
  subject: z.string().trim().max(200),
  message: z.string().trim().min(1, "Bitte eine Nachricht eingeben.").max(5000),
});

export async function submitInquiry(formData: FormData) {
  if (isSpam(formData)) redirect("/kontakt?ok=1"); // Spam stumm verwerfen
  if (!(await verifyTurnstile(formData, "kontakt"))) redirect("/kontakt?fehler=captcha");
  if (!consumeFormSlot(`form:inquiry:${await clientFingerprint()}`, 5, 15 * 60 * 1000)) {
    redirect("/kontakt?fehler=warte");
  }
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
  email: emailField,
  phone: z.string().trim().max(100),
  desiredSize: z.string().trim().max(100),
  message: z.string().trim().max(5000),
});

export async function submitApplication(formData: FormData) {
  if (isSpam(formData)) redirect("/freie-gaerten?ok=1");
  if (!(await verifyTurnstile(formData, "bewerbung"))) redirect("/freie-gaerten?fehler=captcha");
  if (!consumeFormSlot(`form:apply:${await clientFingerprint()}`, 5, 15 * 60 * 1000)) {
    redirect("/freie-gaerten?fehler=warte");
  }
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
