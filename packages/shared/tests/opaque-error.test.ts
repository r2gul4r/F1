import { describe, expect, it } from "vitest";
import { OpaqueError, toOpaqueError } from "../src/security/opaque-error.js";

describe("opaque error", () => {
  it("기본 public message를 유지함", () => {
    const error = new OpaqueError();

    expect(error.publicMessage).toBe("요청 처리 실패");
    expect(error.message).toBe("요청 처리 실패");
  });

  it("기존 OpaqueError는 그대로 반환함", () => {
    const original = new OpaqueError("커스텀 메시지");

    expect(toOpaqueError(original)).toBe(original);
  });

  it("일반 Error는 새 OpaqueError로 감싸고 세부 메시지는 숨김", () => {
    const result = toOpaqueError(new Error("secret-internal-detail"));

    expect(result).toBeInstanceOf(OpaqueError);
    expect(result.message).toBe("요청 처리 실패");
    expect(result.publicMessage).toBe("요청 처리 실패");
  });

  it("unknown 값도 새 OpaqueError로 감쌈", () => {
    const result = toOpaqueError({ detail: "secret-object-detail" });

    expect(result).toBeInstanceOf(OpaqueError);
    expect(result.message).toBe("요청 처리 실패");
    expect(result.publicMessage).toBe("요청 처리 실패");
  });
});
