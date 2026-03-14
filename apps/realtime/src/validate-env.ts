import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runRealtimeEnvValidation } from "./env-validation.js";
import { logRealtimeEnvValidationFailure } from "./failure-logging.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");
const envFilePath = resolve(repoRoot, ".env");

type RunRealtimeEnvValidationCliOptions = {
  envFilePath?: string;
  exit?: (code: number) => void;
};

export const runRealtimeEnvValidationCli = (options: RunRealtimeEnvValidationCliOptions = {}): void => {
  try {
    const config = runRealtimeEnvValidation(options.envFilePath ?? envFilePath);
    console.info(`Realtime env validation passed (${config.aiProvider})`);
  } catch (error) {
    logRealtimeEnvValidationFailure(error);
    (options.exit ?? process.exit)(1);
  }
};

const isDirectRun = (): boolean => {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  return import.meta.url === pathToFileURL(entryPath).href;
};

if (isDirectRun()) {
  runRealtimeEnvValidationCli();
}
