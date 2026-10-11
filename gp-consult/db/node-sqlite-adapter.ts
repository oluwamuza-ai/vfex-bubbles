import { DatabaseSync, type StatementSync } from "node:sqlite";

// Minimal better-sqlite3-compatible wrapper over Node's built-in `node:sqlite`, covering exactly
// what drizzle-orm/better-sqlite3 calls (prepare → run/all/get/raw, transaction, pragma).
// Used when the better-sqlite3 native binary is unavailable (e.g. a Node version without a
// prebuilt binary and no C++ toolchain to compile one).

type Param = unknown;

function bindable(p: Param) {
  if (typeof p === "boolean") return p ? 1 : 0;
  if (p === undefined) return null;
  return p as never;
}

class Statement {
  constructor(private s: StatementSync) {}
  run(...params: Param[]) {
    return this.s.run(...params.map(bindable));
  }
  all(...params: Param[]) {
    return this.s.all(...params.map(bindable));
  }
  get(...params: Param[]) {
    return this.s.get(...params.map(bindable));
  }
  raw() {
    const withArrays = <T>(fn: () => T) => {
      this.s.setReturnArrays(true);
      try {
        return fn();
      } finally {
        this.s.setReturnArrays(false);
      }
    };
    return {
      all: (...params: Param[]) => withArrays(() => this.s.all(...params.map(bindable))),
      get: (...params: Param[]) => withArrays(() => this.s.get(...params.map(bindable))),
    };
  }
}

export class NodeSqliteDatabase {
  private db: DatabaseSync;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
  }
  prepare(sql: string) {
    return new Statement(this.db.prepare(sql));
  }
  exec(sql: string) {
    this.db.exec(sql);
  }
  pragma(p: string) {
    this.db.exec(`PRAGMA ${p}`);
  }
  transaction<A extends unknown[], R>(fn: (...args: A) => R) {
    const run = (mode: string) => (...args: A): R => {
      this.db.exec(`BEGIN ${mode}`);
      try {
        const result = fn(...args);
        this.db.exec("COMMIT");
        return result;
      } catch (e) {
        if (this.db.isTransaction) this.db.exec("ROLLBACK");
        throw e;
      }
    };
    return Object.assign(run("DEFERRED"), { deferred: run("DEFERRED"), immediate: run("IMMEDIATE"), exclusive: run("EXCLUSIVE") });
  }
}
