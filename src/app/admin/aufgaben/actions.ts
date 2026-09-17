"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireWrite } from "@/lib/auth";
import { nowIso, parseDateInput } from "@/lib/format";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  assignee: z.string().trim().max(200).default(""),
  dueDate: z.string().trim().max(10).default(""),
});

export async function createTask(formData: FormData) {
  await requireWrite();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignee: formData.get("assignee"),
    dueDate: parseDateInput(String(formData.get("dueDate") ?? "")) ?? "",
  });
  if (!parsed.success) redirect("/admin/aufgaben?fehler=eingabe");
  const data = parsed.data;
  db.insert(tables.tasks)
    .values({ ...data, dueDate: data.dueDate || null, createdAt: nowIso() })
    .run();
  revalidatePath("/admin/aufgaben");
  redirect("/admin/aufgaben?ok=1");
}

export async function setTaskStatus(taskId: number, formData: FormData) {
  await requireWrite();
  const parsed = z.enum(["offen", "in_arbeit", "erledigt"]).safeParse(formData.get("status"));
  if (!parsed.success) redirect("/admin/aufgaben?fehler=eingabe");
  db.update(tables.tasks).set({ status: parsed.data }).where(eq(tables.tasks.id, taskId)).run();
  revalidatePath("/admin/aufgaben");
  redirect("/admin/aufgaben?ok=1");
}

export async function deleteTask(taskId: number) {
  await requireWrite();
  db.delete(tables.tasks).where(eq(tables.tasks.id, taskId)).run();
  revalidatePath("/admin/aufgaben");
}
