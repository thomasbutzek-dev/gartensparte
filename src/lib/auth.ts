import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import {
  canAdministerRole,
  canManageMoneyRole,
  canSeeMoneyRole,
  canSeeSettingsRole,
  canWriteRole,
  isDemoRole,
  type Role,
} from "@/lib/roles";
import { isMoneyLetterGroup, isMoneyLetterType } from "@/lib/letter-catalog";

const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
const SESSION_COOKIE_ALIASES = ["session", "__Host-session"] as const;
const SESSION_DAYS = 14;

export type { Role };
export type SessionUser = { id: number; name: string; username: string; role: Role; mustChangePassword: boolean };

export { hashPassword, verifyPassword } from "@/lib/password";

// ---------- Sessions ----------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(name: string, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: name.startsWith("__Host-") || process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function createSession(userId: number): Promise<void> {
  await destroySession();
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.insert(tables.sessions).values({ id: hashToken(token), userId, expiresAt }).run();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_COOKIE, SESSION_DAYS * 24 * 60 * 60));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  for (const name of SESSION_COOKIE_ALIASES) {
    const token = jar.get(name)?.value;
    if (token) db.delete(tables.sessions).where(eq(tables.sessions.id, hashToken(token))).run();
    if (!token && name !== SESSION_COOKIE) continue;
    jar.set(name, "", sessionCookieOptions(name, 0));
  }
}

/** Angemeldeten Benutzer ermitteln (oder null). Pro Request gecacht. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? jar.get("session")?.value ?? jar.get("__Host-session")?.value;
  if (!token) return null;
  const session = db.select().from(tables.sessions).where(eq(tables.sessions.id, hashToken(token))).get();
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    db.delete(tables.sessions).where(eq(tables.sessions.id, session.id)).run();
    return null;
  }
  const user = db.select().from(tables.users).where(eq(tables.users.id, session.userId)).get();
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword };
});

/** Wie getSessionUser, aber ohne Sitzung mit noch nicht gewechseltem Startpasswort. */
export async function getPrivilegedSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.mustChangePassword) return null;
  return user;
}

// ---------- Rechte ----------

export function isDemo(user: SessionUser): boolean {
  return isDemoRole(user.role);
}

export function canWrite(user: SessionUser): boolean {
  return canWriteRole(user.role);
}

/** Kassengeschäfte ausführen: Zahlungen, Rechnungen, Mahnungen. */
export function canManageMoney(user: SessionUser): boolean {
  return canManageMoneyRole(user.role);
}

/** Kasse anschauen, ohne zu buchen. Demo darf mitlesen. */
export function canSeeMoney(user: SessionUser): boolean {
  return canSeeMoneyRole(user.role);
}

/** Benutzerverwaltung und Einstellungen ändern. */
export function canAdminister(user: SessionUser): boolean {
  return canAdministerRole(user.role);
}

/** Bank, Beiträge und Impressum anschauen. Demo darf mitlesen. */
export function canSeeSettings(user: SessionUser): boolean {
  return canSeeSettingsRole(user.role);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.mustChangePassword) redirect("/login/passwort");
  return user;
}

/** Sitzung ohne Passwortwechsel – nur für die Seite, auf der das Startpasswort ersetzt wird. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireWrite(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/admin?fehler=demo");
  return user;
}

/** Kasse ausführen. Demo kommt hier nicht durch. */
export async function requireMoneyRole(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageMoney(user)) redirect("/admin?fehler=rechte");
  return user;
}

export async function requireMoneyWrite(): Promise<SessionUser> {
  const user = await requireWrite();
  if (!canManageMoney(user)) redirect("/admin?fehler=rechte");
  return user;
}

export async function requireAdminRole(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAdminister(user)) redirect("/admin?fehler=rechte");
  return user;
}

/** Rechnung/Mahnung nur Kasse (Demo darf lesen). Andere Briefe jeder Angemeldete. */
export async function requireLetterRead(type: string): Promise<SessionUser> {
  const user = await requireUser();
  if (isMoneyLetterType(type) && !canSeeMoney(user)) redirect("/admin?fehler=rechte");
  return user;
}

export async function requireLetterWrite(type: string): Promise<SessionUser> {
  if (isMoneyLetterType(type)) return requireMoneyWrite();
  return requireWrite();
}

export async function requireTemplateWrite(letterGroup: string): Promise<SessionUser> {
  if (isMoneyLetterGroup(letterGroup)) return requireMoneyWrite();
  return requireWrite();
}
