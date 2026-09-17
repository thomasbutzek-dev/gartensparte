import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/password";
import { LETTER_CATALOG } from "@/lib/letter-catalog";
import {
  WELL_KNOWN_START_PASSWORD,
  configuredDemoPassword,
  configuredStartPassword,
  demoEnabled,
} from "@/lib/start-password";
import * as schema from "./schema";

/** Erstbefüllung: Admin-Konto und Briefvorlagen. Gärten legt der Vorstand unter Gärten an. */
export function ensureSeeded(db: BetterSQLite3Database<typeof schema>) {
  const now = new Date().toISOString();

  const hasUsers = db.select({ id: schema.users.id }).from(schema.users).limit(1).all().length > 0;
  if (!hasUsers) {
    db.insert(schema.users)
      .values({
        name: "Administrator",
        username: "admin",
        passwordHash: hashPassword(configuredStartPassword()),
        role: "admin",
        active: true,
        mustChangePassword: true,
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();

    if (demoEnabled()) {
      db.insert(schema.users)
        .values({
          name: "Demo",
          username: "demo",
          passwordHash: hashPassword(configuredDemoPassword()),
          role: "demo",
          active: true,
          mustChangePassword: false,
          createdAt: now,
        })
        .onConflictDoNothing()
        .run();
    }
  }

  flagKnownStartPasswords(db);

  for (const template of LETTER_CATALOG) {
    const existing = db
      .select()
      .from(schema.letterTemplates)
      .where(eq(schema.letterTemplates.type, template.type))
      .get();
    if (!existing) {
      db.insert(schema.letterTemplates)
        .values({
          type: template.type,
          name: template.name,
          letterGroup: template.letterGroup,
          effect: template.effect,
          locked: template.locked,
          subject: template.subject,
          body: template.body,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .run();
      continue;
    }
    if (!existing.name) {
      db.update(schema.letterTemplates)
        .set({
          name: template.name,
          letterGroup: template.letterGroup,
          effect: template.effect,
          locked: template.locked,
        })
        .where(eq(schema.letterTemplates.id, existing.id))
        .run();
    }
  }
}

function flagKnownStartPasswords(db: BetterSQLite3Database<typeof schema>) {
  const users = db.select().from(schema.users).all();
  for (const user of users) {
    if (user.role === "demo" || user.mustChangePassword) continue;
    if (
      verifyPassword(WELL_KNOWN_START_PASSWORD, user.passwordHash) ||
      verifyPassword(configuredStartPassword(), user.passwordHash)
    ) {
      db.update(schema.users).set({ mustChangePassword: true }).where(eq(schema.users.id, user.id)).run();
    }
  }
}
