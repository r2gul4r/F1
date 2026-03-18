export const toAiProviderLabel = (provider: "disabled" | "ollama" | "gemini" | "unknown"): string => {
  if (provider === "disabled") {
    return "Fallback only";
  }

  if (provider === "ollama") {
    return "Ollama";
  }

  if (provider === "gemini") {
    return "Gemini";
  }

  return "Unknown";
};

export const toPredictionContextLabel = (input: {
  selectedDriverPriority: boolean;
  selectedPredictionStale: boolean;
}): string => {
  if (input.selectedPredictionStale) {
    return "Selected stale";
  }

  if (input.selectedDriverPriority) {
    return "Selected priority";
  }

  return "Overall latest";
};
