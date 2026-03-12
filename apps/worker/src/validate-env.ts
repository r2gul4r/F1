import { toOpaqueError } from "@f1/shared";
import { readConfig } from "./config.js";

try {
  const config = readConfig();
  console.info(`Worker env validation passed (${config.dataSource})`);
} catch (error) {
  const opaque = toOpaqueError(error);
  console.error("Worker env validation failed", opaque.publicMessage);
  process.exit(1);
}
