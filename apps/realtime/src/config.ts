import { OpaqueError } from "@f1/shared";

export type RealtimeConfig = {
  port: number;
  postgresUrl: string;
  redisUrl: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  internalApiToken: string;
  watchTokenSecret: string;
  allowedOrigins: string[];
  wsBufferSize: number;
};

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isPlaceholderSecret = (value: string): boolean =>
  [
    "replace-this-token",
    "replace-with-strong-internal-token-32chars",
    "replace-with-strong-watch-token-secret-32chars",
    "change-me",
    "your-token-here",
    "token"
  ].includes(value.trim().toLowerCase());

const assertStrongSecret = (value: string | undefined): string => {
  if (!value || value.trim().length < 24 || isPlaceholderSecret(value)) {
    throw new OpaqueError("설정값 누락");
  }
  return value.trim();
};

const parseAllowedOrigins = (value: string | undefined): string[] => {
  const origins = (value ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new OpaqueError("설정값 누락");
  }

  return origins;
};

export const readConfig = (): RealtimeConfig => {
  const postgresUrl = process.env.POSTGRES_URL;
  const redisUrl = process.env.REDIS_URL;
  const internalApiToken = assertStrongSecret(process.env.INTERNAL_API_TOKEN);
  const watchTokenSecret = assertStrongSecret(process.env.WATCH_TOKEN_SECRET);
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  if (!postgresUrl || !redisUrl || !internalApiToken || !watchTokenSecret) {
    throw new OpaqueError("설정값 누락");
  }

  return {
    port: asNumber(process.env.REALTIME_PORT, 4001),
    postgresUrl,
    redisUrl,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL ?? "gemma3:12b",
    internalApiToken,
    watchTokenSecret,
    allowedOrigins,
    wsBufferSize: asNumber(process.env.WS_BUFFER_SIZE, 2048)
  };
};
