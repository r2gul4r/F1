import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runRealtimeEnvValidation } from "./env-validation.js";
import { logRealtimeEnvValidationFailure } from "./failure-logging.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");
const envFilePath = resolve(repoRoot, ".env");

try {
  const config = runRealtimeEnvValidation(envFilePath);
  console.info(`Realtime env validation passed (${config.aiProvider})`);
} catch (error) {
  logRealtimeEnvValidationFailure(error);
  process.exit(1);
}
