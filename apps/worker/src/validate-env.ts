import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkerEnvValidation } from "./env-validation.js";
import { logWorkerEnvValidationFailure } from "./failure-logging.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");
const envFilePath = resolve(repoRoot, ".env");

try {
  const config = runWorkerEnvValidation(envFilePath);
  console.info(`Worker env validation passed (${config.dataSource})`);
} catch (error) {
  logWorkerEnvValidationFailure(error);
  process.exit(1);
}
