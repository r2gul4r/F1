import { afterEach, describe, expect, it, vi } from "vitest";

const runDatabaseMigrationMock = vi.fn();

vi.mock("../src/store/database-migration.js", () => ({
  runDatabaseMigration: runDatabaseMigrationMock
}));

describe("migrate cli", () => {
  afterEach(() => {
    runDatabaseMigrationMock.mockReset();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("마이그레이션 성공 시 applied count를 로그하고 종료를 호출하지 않음", async () => {
    runDatabaseMigrationMock.mockResolvedValue(3);
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runMigrationCli } = await import("../src/migrate.js");
    await runMigrationCli({
      connectionString: "postgresql://postgres:postgres@localhost:5432/f1pulse",
      exit: exitSpy
    });

    expect(consoleInfoSpy).toHaveBeenCalledWith("DB 마이그레이션 완료", 3);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("마이그레이션 실패 시 opaque 로그를 남기고 종료 코드를 전달함", async () => {
    runDatabaseMigrationMock.mockRejectedValue(new Error("secret-migration-detail"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runMigrationCli } = await import("../src/migrate.js");
    await runMigrationCli({
      connectionString: "postgresql://postgres:postgres@localhost:5432/f1pulse",
      exit: exitSpy
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("리얼타임 DB 마이그레이션 실패", "요청 처리 실패");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
