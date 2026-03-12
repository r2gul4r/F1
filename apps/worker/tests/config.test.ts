import { beforeEach, describe, expect, it } from "vitest";
import { readConfig } from "../src/config.js";

const baseEnv = {
  REALTIME_BASE_URL: "http://localhost:4001",
  INTERNAL_API_TOKEN: "internal-token-for-test-123456"
};

describe("worker config", () => {
  beforeEach(() => {
    process.env.REALTIME_BASE_URL = baseEnv.REALTIME_BASE_URL;
    process.env.INTERNAL_API_TOKEN = baseEnv.INTERNAL_API_TOKEN;
    delete process.env.OPENF1_API_KEY;
    delete process.env.DATA_SOURCE;
  });

  it("openf1 모드에서 api 키 누락 시 실패함", () => {
    process.env.DATA_SOURCE = "openf1";
    expect(() => readConfig()).toThrow();
  });

  it("mock 모드에서는 api 키 없이 통과함", () => {
    const config = readConfig();

    expect(config.dataSource).toBe("mock");
    expect(config.openF1ApiKey).toBeUndefined();
  });

  it("내부 토큰이 약하면 실패함", () => {
    process.env.INTERNAL_API_TOKEN = "token";
    expect(() => readConfig()).toThrow();
  });

  it("openf1 모드에서 api 키가 있으면 통과함", () => {
    process.env.DATA_SOURCE = "openf1";
    process.env.OPENF1_API_KEY = "test-api-key";

    const config = readConfig();

    expect(config.dataSource).toBe("openf1");
    expect(config.openF1ApiKey).toBe("test-api-key");
  });
});
