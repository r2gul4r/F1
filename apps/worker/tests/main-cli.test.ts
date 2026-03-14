import { afterEach, describe, expect, it, vi } from "vitest";

const readConfigMock = vi.fn();

vi.mock("../src/config.js", () => ({
  readConfig: readConfigMock
}));

describe("worker main cli", () => {
  afterEach(() => {
    readConfigMock.mockReset();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("startup 실패 시 opaque 로그를 남기고 종료 코드를 전달함", async () => {
    readConfigMock.mockImplementation(() => {
      throw new Error("secret-startup-detail");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runWorkerCli } = await import("../src/main.js");
    await runWorkerCli({
      exit: exitSpy
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("워커 시작 실패", "요청 처리 실패");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
