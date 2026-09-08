import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { LETTER_CATALOG } from "@/lib/letter-catalog";
import * as schema from "./schema";

/** Erstbefüllung: Admin-Konto und Briefvorlagen. Gärten legt der Vorstand unter Gärten an. */
export function ensureSeeded(db: BetterSQLite3Database<typeof schema>) {
  const now = new Date().toISOString();

  const hasUsers = db.select({ id: schema.users.id }).from(schema.users).limit(1).all().length > 0;
  if (!hasUsers) {
    const password = process.env.ADMIN_START_PASSWORD || "gartensparte-start";
    db.insert(schema.users)
      .values({
        name: "Administrator",
        username: "admin",
        passwordHash: hashPassword(password),
        role: "admin",
        active: true,
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

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
