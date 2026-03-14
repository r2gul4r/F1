import { describe, expect, it, vi } from "vitest";
import {
  logWorkerEnvValidationFailure,
  logWorkerRealtimeSendFailure,
  logWorkerStartupFailure
} from "../src/failure-logging.js";

describe("worker failure logging", () => {
  it("startup failure는 opaque 메시지로만 로그를 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logWorkerStartupFailure(new Error("secret-startup-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("워커 시작 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("env validation failure는 opaque 메시지로만 로그를 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logWorkerEnvValidationFailure(new Error("secret-env-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("워커 환경 검증 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("realtime transport failure는 opaque 메시지로만 로그를 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logWorkerRealtimeSendFailure(new Error("secret-transport-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("워커 전송 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
