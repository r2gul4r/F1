import { toOpaqueError } from "@f1/shared";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runRealtimeEnvValidation } from "./env-validation.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");
const envFilePath = resolve(repoRoot, ".env");

try {
  const config = runRealtimeEnvValidation(envFilePath);
  console.info(`Realtime env validation passed (${config.aiProvider})`);
} catch (error) {
  const opaque = toOpaqueError(error);
  console.error("Realtime env validation failed", opaque.publicMessage);
  process.exit(1);
}
