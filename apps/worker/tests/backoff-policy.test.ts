import { describe, expect, it } from "vitest";
import { getNextPollDelayMs, nextBackoffState } from "../src/backoff-policy.js";

describe("backoff policy", () => {
  const policy = {
    baseMs: 1000,
    maxMs: 8000,
    multiplier: 2
  };

  it("첫 실패 이후 다음 poll 대기시간이 증가함", () => {
    const state = nextBackoffState({ consecutiveFailures: 0 }, "failure");
    const delayMs = getNextPollDelayMs(policy, state);

    expect(delayMs).toBeGreaterThan(policy.baseMs);
    expect(delayMs).toBe(2000);
  });

  it("반복 실패 시 최대 대기시간으로 캡핑함", () => {
    const failed = Array.from({ length: 10 }).reduce(
      (state) => nextBackoffState(state, "failure"),
      { consecutiveFailures: 0 }
    );

    const delayMs = getNextPollDelayMs(policy, failed);

    expect(delayMs).toBe(policy.maxMs);
  });

  it("성공하면 backoff 상태가 초기화됨", () => {
    const failedTwice = nextBackoffState(
      nextBackoffState({ consecutiveFailures: 0 }, "failure"),
      "failure"
    );
    const recovered = nextBackoffState(failedTwice, "primary_success");
    const delayMs = getNextPollDelayMs(policy, recovered);

    expect(recovered).toEqual({ consecutiveFailures: 0 });
    expect(delayMs).toBe(policy.baseMs);
  });

  it("degraded 상태에서는 fallback 성공이어도 backoff가 유지됨", () => {
    const failedOnce = nextBackoffState({ consecutiveFailures: 0 }, "failure");
    const degraded = nextBackoffState(failedOnce, "degraded");
    const delayMs = getNextPollDelayMs(policy, degraded);

    expect(degraded).toEqual({ consecutiveFailures: 2 });
    expect(delayMs).toBe(4000);
  });
});
