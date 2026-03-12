import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runRealtimeEnvValidation } from "../src/env-validation.js";

const tempDirs: string[] = [];

const createEnvFile = (content: string): string => {
  const tempRoot = mkdtempSync(join(tmpdir(), "f1-env-validation-"));
  tempDirs.push(tempRoot);
  mkdirSync(tempRoot, { recursive: true });
  const envPath = join(tempRoot, ".env");
  writeFileSync(envPath, content, "utf8");
  return envPath;
};

describe("realtime env validation", () => {
  afterEach(() => {
    tempDirs.splice(0).forEach((path) => {
      try {
        rmSync(path, { recursive: true, force: true });
      } catch {
      }
    });

    [
      "POSTGRES_URL",
      "REDIS_URL",
      "INTERNAL_API_TOKEN",
      "OAUTH_PROXY_TOKEN",
      "WATCH_TOKEN_SECRET",
      "ALLOWED_ORIGINS",
      "AI_PROVIDER",
      "OPENF1_API_KEY"
    ].forEach((key) => {
      Reflect.deleteProperty(process.env, key);
    });
  });

  it("placeholder secret가 남아 있으면 실패함", () => {
    const envPath = createEnvFile([
      "POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/f1pulse",
      "REDIS_URL=redis://localhost:6379",
      "INTERNAL_API_TOKEN=replace-with-strong-internal-token-32chars",
      "OAUTH_PROXY_TOKEN=replace-with-strong-oauth-proxy-token-32chars",
      "WATCH_TOKEN_SECRET=replace-with-strong-watch-token-secret-32chars",
      "ALLOWED_ORIGINS=http://localhost:3000",
      "AI_PROVIDER=ollama",
      "OPENF1_API_KEY=replace-with-your-openf1-api-key"
    ].join("\n"));

    expect(() => runRealtimeEnvValidation(envPath)).toThrow();
  });
});
