import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runWorkerEnvValidation } from "../src/env-validation.js";

const tempDirs: string[] = [];

const createEnvFile = (content: string): string => {
  const tempRoot = mkdtempSync(join(tmpdir(), "f1-worker-env-validation-"));
  tempDirs.push(tempRoot);
  mkdirSync(tempRoot, { recursive: true });
  const envPath = join(tempRoot, ".env");
  writeFileSync(envPath, content, "utf8");
  return envPath;
};

describe("worker env validation", () => {
  afterEach(() => {
    tempDirs.splice(0).forEach((path) => {
      try {
        rmSync(path, { recursive: true, force: true });
      } catch {
      }
    });

    [
      "REALTIME_BASE_URL",
      "INTERNAL_API_TOKEN",
      "OPENF1_API_KEY",
      "DATA_SOURCE",
      "OPENF1_BASE_URL",
      "WORKER_POLL_MS"
    ].forEach((key) => {
      Reflect.deleteProperty(process.env, key);
    });
  });

  it("openf1 모드에서 placeholder api 키면 실패함", () => {
    const envPath = createEnvFile([
      "REALTIME_BASE_URL=http://localhost:4001",
      "INTERNAL_API_TOKEN=internal-token-for-test-123456",
      "DATA_SOURCE=openf1",
      "OPENF1_API_KEY=replace-with-your-openf1-api-key"
    ].join("\n"));

    expect(() => runWorkerEnvValidation(envPath)).toThrow();
  });

  it("mock 모드에서는 OPENF1_API_KEY 없이 통과함", () => {
    const envPath = createEnvFile([
      "REALTIME_BASE_URL=http://localhost:4001",
      "INTERNAL_API_TOKEN=internal-token-for-test-123456",
      "DATA_SOURCE=mock"
    ].join("\n"));

    const config = runWorkerEnvValidation(envPath);

    expect(config.dataSource).toBe("mock");
    expect(config.openF1ApiKey).toBeUndefined();
  });
});
