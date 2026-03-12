import { beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "../src/config.js";

describe("realtime config", () => {
  beforeEach(() => {
    process.env.POSTGRES_URL = "postgresql://postgres:postgres@localhost:5432/f1pulse";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.INTERNAL_API_TOKEN = "internal-token-for-test-123456";
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.WATCH_TOKEN_SECRET = "watch-token-secret-for-test-123456";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.REALTIME_PORT = "4001";
    process.env.WS_BUFFER_SIZE = "1024";
    process.env.AI_PROVIDER = "ollama";
    Reflect.deleteProperty(process.env, "GEMINI_API_KEY");
  });

  it("필수 설정이 유효하면 통과함", () => {
    const config = readConfig();
    expect(config.allowedOrigins).toContain("http://localhost:3000");
  });

  it("약한 내부 토큰이면 실패함", () => {
    process.env.INTERNAL_API_TOKEN = "token";
    expect(() => readConfig()).toThrow();
  });

  it("약한 watch 시크릿이면 실패함", () => {
    process.env.WATCH_TOKEN_SECRET = "token";
    expect(() => readConfig()).toThrow();
  });

  it("gemini provider는 api key가 없으면 실패함", () => {
    process.env.AI_PROVIDER = "gemini";

    expect(() => readConfig()).toThrow();
  });

  it("지원하지 않는 ai provider면 실패함", () => {
    process.env.AI_PROVIDER = "unknown";

    expect(() => readConfig()).toThrow();
  });
});
