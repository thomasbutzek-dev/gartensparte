import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "./schema";
import { ensureSeeded } from "./seed";

const dataDir = process.env.DATA_DIR || join(process.cwd(), "data");
export const uploadsDir = join(dataDir, "uploads");
export const lettersDir = join(dataDir, "letters");

for (const dir of [
  dataDir,
  join(uploadsDir, "dokumente"),
  join(uploadsDir, "gaerten"),
  join(uploadsDir, "karte"),
  join(uploadsDir, "website"),
  join(uploadsDir, "galerie"),
  join(uploadsDir, "vorstand"),
  lettersDir,
]) {
  mkdirSync(dir, { recursive: true });
}

const globalForDb = globalThis as unknown as { __sqlite?: Database.Database };

const sqlite =
  globalForDb.__sqlite ??
  (() => {
    const instance = new Database(join(dataDir, "gartensparte.sqlite"));
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    return instance;
  })();
globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });

// Migrationen beim Start anwenden (idempotent), danach Erstbefüllung
migrate(db, { migrationsFolder: join(process.cwd(), "src", "db", "migrations") });
ensureSeeded(db);

export * as tables from "./schema";
