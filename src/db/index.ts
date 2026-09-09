import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { closeSync, mkdirSync, openSync, statSync, unlinkSync, writeSync } from "node:fs";
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
    instance.pragma("busy_timeout = 5000");
    return instance;
  })();
globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { ok: number } | undefined;
  return Boolean(row);
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** `next build` startet mehrere Worker; ohne Sperre legen die dieselben Tabellen doppelt an. */
function migrateOnce() {
  if (tableExists("settings")) {
    ensureSeeded(db);
    return;
  }

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
        if (!tableExists("settings")) {
          migrate(db, { migrationsFolder: join(process.cwd(), "src", "db", "migrations") });
        }
        ensureSeeded(db);
      } finally {
        closeSync(fd);
        try {
          unlinkSync(lockPath);
        } catch {
          // schon weg
        }
      }
      return;
    } catch {
      if (tableExists("settings")) {
        ensureSeeded(db);
        return;
      }
      sleepSync(50);
    }
  }
  throw new Error("Datenbank-Start: Lock-Timeout");
}

migrateOnce();
if (process.env.NEXT_PHASE !== "phase-production-build") {
  void import("@/lib/compact-images").then((mod) => mod.startImageCompact());
}

export * as tables from "./schema";
