import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 14;

export type Role = "admin" | "vorstand" | "kassenwart";
export type SessionUser = { id: number; name: string; username: string; role: Role };

export { hashPassword, verifyPassword } from "@/lib/password";

// ---------- Sessions ----------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.insert(tables.sessions).values({ id: hashToken(token), userId, expiresAt }).run();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.delete(tables.sessions).where(eq(tables.sessions.id, hashToken(token))).run();
  jar.delete(SESSION_COOKIE);
}

/** Angemeldeten Benutzer ermitteln (oder null). Pro Request gecacht. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = db.select().from(tables.sessions).where(eq(tables.sessions.id, hashToken(token))).get();
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    db.delete(tables.sessions).where(eq(tables.sessions.id, session.id)).run();
    return null;
  }
  const user = db.select().from(tables.users).where(eq(tables.users.id, session.userId)).get();
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
});

// ---------- Rechte ----------

/** Kassengeschäfte: Zahlungen, Rechnungen, Mahnungen. */
export function canManageMoney(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "kassenwart";
}

/** Benutzerverwaltung und Einstellungen. */
export function canAdminister(user: SessionUser): boolean {
  return user.role === "admin";
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireMoneyRole(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageMoney(user)) redirect("/admin?fehler=rechte");
  return user;
}

export async function requireAdminRole(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAdminister(user)) redirect("/admin?fehler=rechte");
  return user;
}
