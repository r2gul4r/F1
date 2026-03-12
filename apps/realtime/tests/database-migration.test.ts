import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runDatabaseMigration } from "../src/store/database-migration.js";

const createMigrationDir = async (sql: string): Promise<{ cleanup: () => Promise<void>; migrationsDir: string }> => {
  const directory = await mkdtemp(path.join(tmpdir(), "f1-db-migration-"));
  const filePath = path.join(directory, "0001_initial_schema.sql");
  await writeFile(filePath, sql, "utf8");

  return {
    migrationsDir: directory,
    cleanup: () => rm(directory, { recursive: true, force: true })
  };
};

describe("database migration", () => {
  it("마이그레이션 성공 뒤 연결을 정리함", async () => {
    const { migrationsDir, cleanup } = await createMigrationDir("select 1;");
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const close = vi.fn().mockResolvedValue(undefined);
    const connectionFactory = vi.fn().mockReturnValue({
      pool: { query },
      close
    });

    try {
      await runDatabaseMigration({
        connectionString: "postgresql://postgres:postgres@localhost:5432/f1pulse",
        migrationsDir,
        connectionFactory
      });
    } finally {
      await cleanup();
    }

    expect(query.mock.calls.some((call) => call[0] === "select 1;")).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("마이그레이션 실패여도 연결을 정리함", async () => {
    const { migrationsDir, cleanup } = await createMigrationDir("select 1;");
    const close = vi.fn().mockResolvedValue(undefined);
    const connectionFactory = vi.fn().mockReturnValue({
      pool: {
        query: vi.fn().mockRejectedValue(new Error("boom"))
      },
      close
    });

    try {
      await expect(
        runDatabaseMigration({
          connectionString: "postgresql://postgres:postgres@localhost:5432/f1pulse",
          migrationsDir,
          connectionFactory
        })
      ).rejects.toThrow("boom");
    } finally {
      await cleanup();
    }

    expect(close).toHaveBeenCalledTimes(1);
  });
});
