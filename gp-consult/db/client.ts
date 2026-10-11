import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

// Single place that knows about the driver. To move to Turso, swap this file for
// drizzle-orm/libsql + @libsql/client; the query code elsewhere is unchanged.

type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __gpDb?: DB };

function open(): DB {
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gp.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  seedIfEmpty(db);
  return db;
}

export function getDb(): DB {
  if (!globalForDb.__gpDb) globalForDb.__gpDb = open();
  return globalForDb.__gpDb;
}

export { schema };
