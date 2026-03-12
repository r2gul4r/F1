import { OpaqueError } from "@f1/shared";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

type Queryable = Pick<Pool, "query">;

export type MigrationRunnerInput = {
  pool: Queryable;
  migrationsDir?: string;
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = join(currentDirectory, "../../migrations");

const createMigrationsTableSql =
  "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())";

const selectAppliedMigrationNamesSql = "select name from schema_migrations order by name asc";

const insertAppliedMigrationSql = "insert into schema_migrations (name) values ($1) on conflict (name) do nothing";

const listMigrationFiles = async (migrationsDir: string): Promise<string[]> => {
  try {
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    throw new OpaqueError("요청 처리 실패");
  }
};

const readMigrationSql = async (migrationsDir: string, fileName: string): Promise<string> => {
  try {
    const sql = (await readFile(join(migrationsDir, fileName), "utf8")).trim();
    if (sql.length === 0) {
      throw new OpaqueError("요청 처리 실패");
    }
    return sql;
  } catch (error) {
    if (error instanceof OpaqueError) {
      throw error;
    }
    throw new OpaqueError("요청 처리 실패");
  }
};

export const runDatabaseMigrations = async (input: MigrationRunnerInput): Promise<string[]> => {
  await input.pool.query(createMigrationsTableSql);

  const { rows } = await input.pool.query(selectAppliedMigrationNamesSql);
  const applied = new Set(rows.map((row) => String(row.name)));
  const migrationsDir = input.migrationsDir ?? defaultMigrationsDir;
  const migrationFiles = await listMigrationFiles(migrationsDir);
  const executed: string[] = [];

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    const sql = await readMigrationSql(migrationsDir, fileName);

    await input.pool.query("begin");

    try {
      await input.pool.query(sql);
      await input.pool.query(insertAppliedMigrationSql, [fileName]);
      await input.pool.query("commit");
      executed.push(fileName);
      applied.add(fileName);
    } catch (error) {
      await input.pool.query("rollback");
      throw error;
    }
  }

  return executed;
};
