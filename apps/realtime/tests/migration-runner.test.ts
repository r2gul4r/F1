import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { runDatabaseMigrations } from "../src/store/migration-runner.js";

type QueryResultRow = Record<string, unknown>;

type MockPool = {
  applied: string[];
  calls: Array<{ text: string; values?: readonly unknown[] }>;
  query: (text: string, values?: readonly unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

const createMockPool = (initialApplied: string[] = []): MockPool => {
  const applied = [...initialApplied];
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];

  return {
    applied,
    calls,
    query: async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });

      if (text.includes("select name from schema_migrations")) {
        return {
          rows: applied.map((name) => ({ name }))
        };
      }

      if (text.includes("insert into schema_migrations")) {
        const name = String(values?.[0] ?? "");
        applied.push(name);
      }

      return { rows: [] };
    }
  };
};

const tempDirs: string[] = [];

const createMigrationDir = async (files: Array<{ name: string; sql: string }>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "f1-migrations-"));
  tempDirs.push(directory);

  await Promise.all(files.map((file) => writeFile(join(directory, file.name), file.sql, "utf8")));

  return directory;
};

describe("database migration runner", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it("pending migration 파일을 정렬 순서대로 한 번씩 적용함", async () => {
    const migrationsDir = await createMigrationDir([
      {
        name: "0002_add_index.sql",
        sql: "create index if not exists idx_test on test_table(id);"
      },
      {
        name: "0001_create_table.sql",
        sql: "create table if not exists test_table (id text primary key);"
      }
    ]);
    const pool = createMockPool();

    const applied = await runDatabaseMigrations({
      pool,
      migrationsDir
    });

    expect(applied).toEqual(["0001_create_table.sql", "0002_add_index.sql"]);
    expect(pool.applied).toEqual(["0001_create_table.sql", "0002_add_index.sql"]);
    expect(pool.calls.some((call) => call.text === "begin")).toBe(true);
    expect(pool.calls.some((call) => call.text.includes("create table if not exists test_table"))).toBe(true);
    expect(pool.calls.some((call) => call.text.includes("create index if not exists idx_test"))).toBe(true);
  });

  it("이미 기록된 migration은 건너뜀", async () => {
    const migrationsDir = await createMigrationDir([
      {
        name: "0001_create_table.sql",
        sql: "create table if not exists test_table (id text primary key);"
      },
      {
        name: "0002_add_index.sql",
        sql: "create index if not exists idx_test on test_table(id);"
      }
    ]);
    const pool = createMockPool(["0001_create_table.sql"]);

    const applied = await runDatabaseMigrations({
      pool,
      migrationsDir
    });

    expect(applied).toEqual(["0002_add_index.sql"]);
    expect(pool.applied).toEqual(["0001_create_table.sql", "0002_add_index.sql"]);
    expect(pool.calls.some((call) => call.text.includes("create table if not exists test_table"))).toBe(false);
    expect(pool.calls.some((call) => call.text.includes("create index if not exists idx_test"))).toBe(true);
  });
});
