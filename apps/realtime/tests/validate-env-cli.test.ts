import { afterEach, describe, expect, it, vi } from "vitest";

const runRealtimeEnvValidationMock = vi.fn();

vi.mock("../src/env-validation.js", () => ({
  runRealtimeEnvValidation: runRealtimeEnvValidationMock
}));

describe("realtime env validation cli", () => {
  afterEach(() => {
    runRealtimeEnvValidationMock.mockReset();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("검증 성공 시 provider를 로그하고 종료 코드를 호출하지 않음", async () => {
    runRealtimeEnvValidationMock.mockReturnValue({
      aiProvider: "gemini"
    });
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runRealtimeEnvValidationCli } = await import("../src/validate-env.js");
    runRealtimeEnvValidationCli({
      envFilePath: "C:\\temp\\.env",
      exit: exitSpy
    });

    expect(consoleInfoSpy).toHaveBeenCalledWith("Realtime env validation passed (gemini)");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("검증 실패 시 opaque 로그를 남기고 종료 코드를 전달함", async () => {
    runRealtimeEnvValidationMock.mockImplementation(() => {
      throw new Error("secret-env-detail");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitSpy = vi.fn();

    const { runRealtimeEnvValidationCli } = await import("../src/validate-env.js");
    runRealtimeEnvValidationCli({
      envFilePath: "C:\\temp\\.env",
      exit: exitSpy
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("리얼타임 환경 검증 실패", "요청 처리 실패");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
