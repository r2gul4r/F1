import { describe, expect, it } from "vitest";
import { decideBackoffOutcome } from "../src/backoff-outcome.js";

describe("backoff outcome helper", () => {
  it("OpenF1 실패 후 mock fallback 성공이면 degraded를 반환함", () => {
    const outcome = decideBackoffOutcome({
      primarySourceSucceeded: false,
      fallbackSourceSucceeded: true
    });

    expect(outcome).toBe("degraded");
  });

  it("원본 source 성공만 primary_success를 반환함", () => {
    const outcome = decideBackoffOutcome({
      primarySourceSucceeded: true,
      fallbackSourceSucceeded: false
    });

    expect(outcome).toBe("primary_success");
  });

  it("원본 source와 fallback이 모두 실패하면 failure를 반환함", () => {
    const outcome = decideBackoffOutcome({
      primarySourceSucceeded: false,
      fallbackSourceSucceeded: false
    });

    expect(outcome).toBe("failure");
  });
});
