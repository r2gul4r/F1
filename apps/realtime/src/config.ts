import { OpaqueError } from "@f1/shared";

export type RealtimeConfig = {
  port: number;
  postgresUrl: string;
  redisUrl: string;
  aiProvider: "ollama" | "gemini";
  ollamaBaseUrl: string;
  ollamaModel: string;
  geminiApiKey?: string;
  geminiModel: string;
  internalApiToken: string;
  oauthProxyToken: string;
  watchTokenSecret: string;
  watchTokenTtlSec: number;
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

const parseAiProvider = (value: string | undefined): "ollama" | "gemini" => {
  const normalized = (value ?? "ollama").trim().toLowerCase();
  if (normalized === "ollama" || normalized === "gemini") {
    return normalized;
  }

  throw new OpaqueError("설정값 누락");
};

export const readConfig = (): RealtimeConfig => {
  const postgresUrl = process.env.POSTGRES_URL;
  const redisUrl = process.env.REDIS_URL;
  const aiProvider = parseAiProvider(process.env.AI_PROVIDER);
  const internalApiToken = assertStrongSecret(process.env.INTERNAL_API_TOKEN);
  const oauthProxyToken = assertStrongSecret(process.env.OAUTH_PROXY_TOKEN);
  const watchTokenSecret = assertStrongSecret(process.env.WATCH_TOKEN_SECRET);
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const geminiApiKey = aiProvider === "gemini" ? assertStrongSecret(process.env.GEMINI_API_KEY) : undefined;

  if (!postgresUrl || !redisUrl || !internalApiToken || !oauthProxyToken || !watchTokenSecret) {
    throw new OpaqueError("설정값 누락");
  }

  return {
    port: asNumber(process.env.REALTIME_PORT, 4001),
    postgresUrl,
    redisUrl,
    aiProvider,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL ?? "gemma3:12b",
    geminiApiKey,
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    internalApiToken,
    oauthProxyToken,
    watchTokenSecret,
    watchTokenTtlSec: asNumber(process.env.WATCH_TOKEN_TTL_SEC, 3600),
    allowedOrigins,
    wsBufferSize: asNumber(process.env.WS_BUFFER_SIZE, 2048)
  };
};
