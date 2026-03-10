import { describe, expect, it } from "vitest";
import { createDatabaseConnection } from "../src/store/database-connection.js";

const connectionString = "postgresql://postgres:postgres@localhost:5432/f1pulse";

describe("database connection module", () => {
  it("유효한 설정이면 DB 연결 객체를 생성함", async () => {
    const connection = createDatabaseConnection({
      connectionString
    });

    expect(connection.pool).toBeDefined();
    expect((connection.pool as unknown as { options: { connectionString: string } }).options.connectionString).toBe(
      connectionString
    );

    await expect(connection.close()).resolves.toBeUndefined();
  });

  it("연결 문자열이 없으면 실패함", () => {
    expect(() => createDatabaseConnection({ connectionString: "" })).toThrow("설정값 누락");
  });
});
