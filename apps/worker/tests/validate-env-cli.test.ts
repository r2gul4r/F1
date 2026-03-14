import { afterEach, describe, expect, it, vi } from "vitest";

const runWorkerEnvValidationMock = vi.fn();

vi.mock("../src/env-validation.js", () => ({
  runWorkerEnvValidation: runWorkerEnvValidationMock
}));

describe("worker env validation cli", () => {
  afterEach(() => {
    runWorkerEnvValidationMock.mockReset();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("검증 성공 시 dataSource를 로그하고 종료 코드를 호출하지 않음", async () => {
    runWorkerEnvValidationMock.mockReturnValue({
      dataSource: "mock"
    });
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runWorkerEnvValidationCli } = await import("../src/validate-env.js");
    runWorkerEnvValidationCli({
      envFilePath: "C:\\temp\\.env",
      exit: exitSpy
    });

    expect(consoleInfoSpy).toHaveBeenCalledWith("Worker env validation passed (mock)");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("검증 실패 시 opaque 로그를 남기고 종료 코드를 전달함", async () => {
    runWorkerEnvValidationMock.mockImplementation(() => {
      throw new Error("secret-env-detail");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runWorkerEnvValidationCli } = await import("../src/validate-env.js");
    runWorkerEnvValidationCli({
      envFilePath: "C:\\temp\\.env",
      exit: exitSpy
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("워커 환경 검증 실패", "요청 처리 실패");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
