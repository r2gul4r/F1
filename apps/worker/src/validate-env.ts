import { toOpaqueError } from "@f1/shared";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkerEnvValidation } from "./env-validation.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");
const envFilePath = resolve(repoRoot, ".env");

try {
  const config = runWorkerEnvValidation(envFilePath);
  console.info(`Worker env validation passed (${config.dataSource})`);
} catch (error) {
  const opaque = toOpaqueError(error);
  console.error("Worker env validation failed", opaque.publicMessage);
  process.exit(1);
}
