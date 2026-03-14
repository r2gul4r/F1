import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWorkerEnvValidation } from "./env-validation.js";
import { logWorkerEnvValidationFailure } from "./failure-logging.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");
const envFilePath = resolve(repoRoot, ".env");

type RunWorkerEnvValidationCliOptions = {
  envFilePath?: string;
  exit?: (code: number) => void;
};

export const runWorkerEnvValidationCli = (options: RunWorkerEnvValidationCliOptions = {}): void => {
  try {
    const config = runWorkerEnvValidation(options.envFilePath ?? envFilePath);
    console.info(`Worker env validation passed (${config.dataSource})`);
  } catch (error) {
    logWorkerEnvValidationFailure(error);
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
  runWorkerEnvValidationCli();
}
