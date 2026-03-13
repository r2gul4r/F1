export type BackoffOutcome = "primary_success" | "degraded" | "failure";

export type BackoffState = {
  consecutiveFailures: number;
};

export type BackoffPolicy = {
  baseMs: number;
  maxMs: number;
  multiplier: number;
};

export const nextBackoffState = (
  state: BackoffState,
  outcome: BackoffOutcome
): BackoffState => outcome === "primary_success"
  ? { consecutiveFailures: 0 }
  : { consecutiveFailures: state.consecutiveFailures + 1 };

export const getNextPollDelayMs = (
  policy: BackoffPolicy,
  state: BackoffState
): number => {
  const failures = Math.max(0, Math.floor(state.consecutiveFailures));
  if (failures === 0) {
    return policy.baseMs;
  }

  const delay = Math.round(policy.baseMs * Math.pow(policy.multiplier, failures));
  return Math.min(policy.maxMs, delay);
};
