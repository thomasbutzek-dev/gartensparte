"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth";
import { nowIso, parseDateInput } from "@/lib/format";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  assignee: z.string().trim().max(200).default(""),
  dueDate: z.string().trim().max(10).default(""),
});

export async function createTask(formData: FormData) {
  await requireUser();
  const data = taskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignee: formData.get("assignee"),
    dueDate: parseDateInput(String(formData.get("dueDate") ?? "")) ?? "",
  });
  db.insert(tables.tasks)
    .values({ ...data, dueDate: data.dueDate || null, createdAt: nowIso() })
    .run();
  revalidatePath("/admin/aufgaben");
  redirect("/admin/aufgaben?ok=1");
}

export async function setTaskStatus(taskId: number, formData: FormData) {
  await requireUser();
  const status = z.enum(["offen", "in_arbeit", "erledigt"]).parse(formData.get("status"));
  db.update(tables.tasks).set({ status }).where(eq(tables.tasks.id, taskId)).run();
  revalidatePath("/admin/aufgaben");
}

export async function deleteTask(taskId: number) {
  await requireUser();
  db.delete(tables.tasks).where(eq(tables.tasks.id, taskId)).run();
  revalidatePath("/admin/aufgaben");
}
