import { OpaqueError } from "@f1/shared";
import { existsSync, readFileSync } from "node:fs";
import { readConfig, RealtimeConfig } from "./config.js";

export const loadDotEnvFile = (envFilePath: string): void => {
  if (!existsSync(envFilePath)) {
    return;
  }

  const lines = readFileSync(envFilePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key.length === 0 || process.env[key] !== undefined) {
      return;
    }

    process.env[key] = value;
  });
};

export const runRealtimeEnvValidation = (envFilePath: string): RealtimeConfig => {
  loadDotEnvFile(envFilePath);
  const config = readConfig();

  if (config.aiProvider === "ollama" && (process.env.OPENF1_API_KEY ?? "").trim().length === 0) {
    throw new OpaqueError("설정값 누락");
  }

  return config;
};
