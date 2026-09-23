import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { closeSync, mkdirSync, openSync, statSync, unlinkSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as schema from "./schema";
import { ensureSeeded } from "./seed";

function resolveDataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  if (process.env.VITEST) {
    return resolve(configured || join(tmpdir(), "gartensparte-test"));
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return resolve(join(tmpdir(), "gartensparte-build-data"));
  }
  if (process.env.NODE_ENV === "production" && configured) {
    return resolve(configured);
  }
  return resolve(join(process.cwd(), "data"));
}

const dataDir = resolveDataDir();
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
  join(uploadsDir, "schaukasten"),
  lettersDir,
]) {
  mkdirSync(dir, { recursive: true });
}

const sqlitePath = join(dataDir, "gartensparte.sqlite");
const globalForDb = globalThis as unknown as { __sqlite?: Database.Database; __sqlitePath?: string };

if (globalForDb.__sqlite && globalForDb.__sqlitePath !== sqlitePath) {
  globalForDb.__sqlite.close();
  globalForDb.__sqlite = undefined;
  globalForDb.__sqlitePath = undefined;
}

const sqlite =
  globalForDb.__sqlite ??
  (() => {
    const instance = new Database(sqlitePath);
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    instance.pragma("busy_timeout = 5000");
    instance.pragma("wal_autocheckpoint = 100");
    return instance;
  })();
globalForDb.__sqlite = sqlite;
globalForDb.__sqlitePath = sqlitePath;

export const db = drizzle(sqlite, { schema });

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const RATE_LIMITS_SQL = `CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
)`;

function hasColumn(table: string, column: string): boolean {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((col) => col.name === column);
}

function ensureRuntimeTables() {
  sqlite.exec(RATE_LIMITS_SQL);
  if (!hasColumn("gardens", "water_meter_number")) {
    sqlite.exec(`ALTER TABLE gardens ADD COLUMN water_meter_number TEXT NOT NULL DEFAULT ''`);
  }
  if (!hasColumn("meter_readings", "kind")) {
    sqlite.exec(`ALTER TABLE meter_readings ADD COLUMN kind TEXT NOT NULL DEFAULT 'strom'`);
  }
  if (!hasColumn("users", "must_change_password")) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
  }
  if (hasColumn("notices", "id") && !hasColumn("notices", "image_file")) {
    sqlite.exec(`ALTER TABLE notices ADD COLUMN image_file TEXT NOT NULL DEFAULT ''`);
  }
}

/** `next build` startet mehrere Worker; ohne Sperre legen die dieselben Tabellen doppelt an. */
function migrateOnce() {
  const lockPath = join(dataDir, ".migrate.lock");
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 60_000) unlinkSync(lockPath);
      } catch {
        // Lock-Datei gibt es nicht oder ist nicht lesbar.
      }
      const fd = openSync(lockPath, "wx");
      try {
        writeSync(fd, String(process.pid));
        migrate(db, { migrationsFolder: join(process.cwd(), "src", "db", "migrations") });
        ensureRuntimeTables();
        ensureSeeded(db);
        sqlite.pragma("wal_checkpoint(PASSIVE)");
      } finally {
        closeSync(fd);
        try {
          unlinkSync(lockPath);
        } catch {
          // schon weg
        }
      }
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        sleepSync(50);
        continue;
      }
      throw error;
    }
  }
  const alreadyReady = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (alreadyReady) {
    ensureRuntimeTables();
    ensureSeeded(db);
    return;
  }
  throw new Error("Datenbank-Start: Lock-Timeout");
}

migrateOnce();
if (process.env.NEXT_PHASE !== "phase-production-build") {
  void import("@/lib/compact-images").then((mod) => mod.startImageCompact());
}

export * as tables from "./schema";
