import type { DesktopRuntimeContext } from "../runtime/runtime-context.js";

export type SessionSourceOption = DesktopRuntimeContext["sessionSourceOptions"][number];
type BuildSessionSourceRecoveryMessageInput = Pick<DesktopRuntimeContext, "sessionSource" | "sessionSourceOptions"> & {
  currentSource: DesktopRuntimeContext["sessionSource"];
};

export const getSupportedLocalSessionSources = (
  runtime: Pick<DesktopRuntimeContext, "sessionSourceOptions">
): SessionSourceOption[] => runtime.sessionSourceOptions.map((option) => ({ ...option }));

export const buildSessionSourceRecoveryMessage = (
  runtime: BuildSessionSourceRecoveryMessageInput
): string => {
  const enabledOptions = runtime.sessionSourceOptions.filter((option) => !option.disabled);
  const runtimeDefaultOption = runtime.sessionSourceOptions.find((option) => option.key === runtime.sessionSource);
  const runtimeDefaultAvailable = Boolean(runtimeDefaultOption && !runtimeDefaultOption.disabled);

  if (enabledOptions.length === 0) {
    return "No local session sources are currently available in this runtime contract.";
  }

  const enabledSourceList = enabledOptions.map((option) => `\`${option.key}\``).join(", ");
  if (!runtimeDefaultAvailable || runtime.currentSource === runtime.sessionSource) {
    return `Available local sources: ${enabledSourceList}. Switch to one of these sources.`;
  }

  return `Available local sources: ${enabledSourceList}. Clear the override to follow the runtime default or switch to one of these sources.`;
};
