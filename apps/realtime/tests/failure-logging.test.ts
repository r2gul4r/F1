import { describe, expect, it, vi } from "vitest";
import {
  logRealtimeEnvValidationFailure,
  logRealtimeMigrationFailure,
  logRealtimeStartupFailure
} from "../src/failure-logging.js";

describe("realtime failure logging", () => {
  it("startup failure는 opaque 메시지로만 로그를 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logRealtimeStartupFailure(new Error("secret-startup-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("리얼타임 서버 시작 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("env validation failure는 opaque 메시지로만 로그를 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logRealtimeEnvValidationFailure(new Error("secret-env-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("리얼타임 환경 검증 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("migration failure는 opaque 메시지로만 로그를 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logRealtimeMigrationFailure(new Error("secret-migration-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("리얼타임 DB 마이그레이션 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
