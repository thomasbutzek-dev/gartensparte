"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, ne, and } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireAdminRole, hashPassword } from "@/lib/auth";
import { nowIso } from "@/lib/format";

const userSchema = z.object({
  name: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,50}$/, "3–50 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt, Minus, Unterstrich"),
  role: z.enum(["admin", "vorstand", "kassenwart"]),
});

export async function createUser(formData: FormData) {
  await requireAdminRole();
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    role: formData.get("role"),
  });
  const password = String(formData.get("password") ?? "");
  if (!parsed.success || password.length < 8) redirect("/admin/benutzer?fehler=eingabe");
  const exists = db.select().from(tables.users).where(eq(tables.users.username, parsed.data.username)).get();
  if (exists) redirect("/admin/benutzer?fehler=benutzername");
  db.insert(tables.users)
    .values({ ...parsed.data, passwordHash: hashPassword(password), active: true, createdAt: nowIso() })
    .run();
  revalidatePath("/admin/benutzer");
  redirect("/admin/benutzer?ok=angelegt");
}

export async function setUserPassword(userId: number, formData: FormData) {
  await requireAdminRole();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/admin/benutzer?fehler=passwort");
  db.update(tables.users).set({ passwordHash: hashPassword(password) }).where(eq(tables.users.id, userId)).run();
  db.delete(tables.sessions).where(eq(tables.sessions.userId, userId)).run();
  revalidatePath("/admin/benutzer");
  redirect("/admin/benutzer?ok=passwort");
}

export async function setUserRole(userId: number, formData: FormData) {
  const admin = await requireAdminRole();
  const role = z.enum(["admin", "vorstand", "kassenwart"]).parse(formData.get("role"));
  if (userId === admin.id) redirect("/admin/benutzer?fehler=selbst");
  db.update(tables.users).set({ role }).where(eq(tables.users.id, userId)).run();
  revalidatePath("/admin/benutzer");
}

export async function toggleUserActive(userId: number) {
  const admin = await requireAdminRole();
  if (userId === admin.id) redirect("/admin/benutzer?fehler=selbst");
  const user = db.select().from(tables.users).where(eq(tables.users.id, userId)).get();
  if (!user) redirect("/admin/benutzer");
  if (user.active) {
    // Letzten aktiven Admin nicht sperren
    const otherAdmins = db
      .select()
      .from(tables.users)
      .where(and(eq(tables.users.role, "admin"), eq(tables.users.active, true), ne(tables.users.id, userId)))
      .all();
    if (user.role === "admin" && otherAdmins.length === 0) redirect("/admin/benutzer?fehler=letzteradmin");
  }
  db.update(tables.users).set({ active: !user.active }).where(eq(tables.users.id, userId)).run();
  if (user.active) db.delete(tables.sessions).where(eq(tables.sessions.userId, userId)).run();
  revalidatePath("/admin/benutzer");
}
