"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { createSession, destroySession, hashPassword, requireSession, verifyPassword } from "@/lib/auth";
import { clearRateLimit, clientFingerprint, isRateLimited, recordRateFailure } from "@/lib/rate-limit";
import { demoEnabled, isStartPassword } from "@/lib/start-password";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_DUMMY_HASH = hashPassword("x", "0123456789abcdef0123456789abcdef");

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ipKey = `login-ip:${await clientFingerprint()}`;
  const userKey = username ? `login:${username}` : ipKey;

  if (isRateLimited(userKey) || isRateLimited(ipKey)) {
    redirect("/login?fehler=gesperrt");
  }

  const user = db.select().from(tables.users).where(eq(tables.users.username, username)).get();
  const allowDemo = demoEnabled();
  const usable = Boolean(user?.active && (user.role !== "demo" || allowDemo));
  const passwordOk = verifyPassword(password, usable ? user!.passwordHash : LOGIN_DUMMY_HASH);
  if (!user || !usable || !passwordOk) {
    const userBlocked = recordRateFailure(userKey, 5, LOGIN_WINDOW_MS, LOGIN_BLOCK_MS);
    const ipBlocked = recordRateFailure(ipKey, 25, LOGIN_WINDOW_MS, LOGIN_BLOCK_MS);
    redirect(userBlocked || ipBlocked ? "/login?fehler=gesperrt" : "/login?fehler=1");
  }

  clearRateLimit(userKey);
  clearRateLimit(ipKey);
  await createSession(user.id);
  redirect(user.mustChangePassword ? "/login/passwort" : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changeOwnPassword(formData: FormData) {
  const session = await requireSession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const row = db.select().from(tables.users).where(eq(tables.users.id, session.id)).get();
  if (!row || !verifyPassword(current, row.passwordHash)) redirect("/login/passwort?fehler=aktuell");
  if (next.length < 8) redirect("/login/passwort?fehler=laenge");
  if (next !== confirm) redirect("/login/passwort?fehler=confirm");
  if (next === current) redirect("/login/passwort?fehler=gleich");
  if (isStartPassword(next)) redirect("/login/passwort?fehler=start");
  db.update(tables.users)
    .set({ passwordHash: hashPassword(next), mustChangePassword: false })
    .where(eq(tables.users.id, session.id))
    .run();
  db.delete(tables.sessions).where(eq(tables.sessions.userId, session.id)).run();
  await createSession(session.id);
  redirect("/admin");
}
