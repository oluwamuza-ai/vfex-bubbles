import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";
import { NodeSqliteDatabase } from "./node-sqlite-adapter";

// Single place that knows about the driver. To move to Turso, swap this file for
// drizzle-orm/libsql + @libsql/client; the query code elsewhere is unchanged.

type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __gpDb?: DB };

function open(): DB {
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gp.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = openSqlite(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle({ client: sqlite as Database.Database, schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  seedIfEmpty(db);
  return db;
}

/** better-sqlite3 when its native binary is available, else Node's built-in node:sqlite. */
function openSqlite(file: string): Database.Database | NodeSqliteDatabase {
  if (process.env.DB_DRIVER === "node-sqlite") return new NodeSqliteDatabase(file);
  try {
    return new Database(file);
  } catch (e) {
    console.warn(`[db] better-sqlite3 unavailable (${(e as Error).message.split("\n")[0]}); using node:sqlite`);
    return new NodeSqliteDatabase(file);
  }
}

export function getDb(): DB {
  if (!globalForDb.__gpDb) globalForDb.__gpDb = open();
  return globalForDb.__gpDb;
}

export { schema };
