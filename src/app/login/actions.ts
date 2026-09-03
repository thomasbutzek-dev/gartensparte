"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

// Einfache Bremse gegen Durchprobieren (pro Prozess)
const failures = new Map<string, { count: number; blockedUntil: number }>();

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const failure = failures.get(username);
  if (failure && failure.blockedUntil > Date.now()) {
    redirect("/login?fehler=gesperrt");
  }

  const user = db.select().from(tables.users).where(eq(tables.users.username, username)).get();
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    const count = (failure?.count ?? 0) + 1;
    failures.set(username, { count, blockedUntil: count >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
    redirect("/login?fehler=1");
  }

  failures.delete(username);
  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
