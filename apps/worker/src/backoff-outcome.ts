import { type BackoffOutcome } from "./backoff-policy.js";

export type BackoffOutcomeInput = {
  primarySourceSucceeded: boolean;
  fallbackSourceSucceeded: boolean;
};

export const decideBackoffOutcome = ({
  primarySourceSucceeded,
  fallbackSourceSucceeded
}: BackoffOutcomeInput): BackoffOutcome => {
  if (primarySourceSucceeded) {
    return "primary_success";
  }

  return fallbackSourceSucceeded ? "degraded" : "failure";
};
