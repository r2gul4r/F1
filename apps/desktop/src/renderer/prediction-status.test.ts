import { describe, expect, it } from "vitest";
import { toAiProviderLabel, toPredictionContextLabel } from "./prediction-status.js";

describe("desktop prediction status", () => {
  it("maps provider labels for desktop AI panel", () => {
    expect(toAiProviderLabel("disabled")).toBe("Fallback only");
    expect(toAiProviderLabel("ollama")).toBe("Ollama");
    expect(toAiProviderLabel("gemini")).toBe("Gemini");
    expect(toAiProviderLabel("unknown")).toBe("Unknown");
  });

  it("maps selected/latest context labels", () => {
    expect(toPredictionContextLabel({ selectedDriverPriority: false, selectedPredictionStale: false })).toBe("Overall latest");
    expect(toPredictionContextLabel({ selectedDriverPriority: true, selectedPredictionStale: false })).toBe("Selected priority");
    expect(toPredictionContextLabel({ selectedDriverPriority: true, selectedPredictionStale: true })).toBe("Selected stale");
  });
});
