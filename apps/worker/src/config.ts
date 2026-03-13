import { OpaqueError } from "@f1/shared";

export type WorkerConfig = {
  realtimeBaseUrl: string;
  openF1BaseUrl: string;
  openF1ApiKey?: string;
  pollMs: number;
  retryBackoffMultiplier: number;
  retryBackoffMaxMs: number;
  realtimePostTimeoutMs: number;
  dataSource: "mock" | "openf1";
  internalApiToken: string;
};

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const asMultiplier = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : fallback;
};

const isPlaceholderSecret = (value: string): boolean =>
  [
    "replace-this-token",
    "replace-with-strong-internal-token-32chars",
    "replace-with-strong-watch-token-secret-32chars",
    "replace-with-your-openf1-api-key",
    "change-me",
    "your-api-key-here",
    "token"
  ].includes(value.trim().toLowerCase());

const assertStrongSecret = (value: string | undefined): string => {
  if (!value || value.trim().length < 24 || isPlaceholderSecret(value)) {
    throw new OpaqueError("설정값 누락");
  }
  return value.trim();
};

const assertOpenF1ApiKey = (value: string | undefined): string => {
  if (!value || value.trim().length < 8 || isPlaceholderSecret(value)) {
    throw new OpaqueError("설정값 누락");
  }
  return value.trim();
};

export const readConfig = (): WorkerConfig => {
  const realtimeBaseUrl = process.env.REALTIME_BASE_URL;
  const internalApiToken = assertStrongSecret(process.env.INTERNAL_API_TOKEN);
  const dataSource = process.env.DATA_SOURCE === "openf1" ? "openf1" : "mock";
  const pollMs = asNumber(process.env.WORKER_POLL_MS, 1000);
  const retryBackoffMaxMs = Math.max(
    pollMs,
    asNumber(process.env.WORKER_RETRY_BACKOFF_MAX_MS, 10000)
  );
  const openF1ApiKey = dataSource === "openf1"
    ? assertOpenF1ApiKey(process.env.OPENF1_API_KEY)
    : process.env.OPENF1_API_KEY?.trim();

  if (!realtimeBaseUrl || !internalApiToken) {
    throw new OpaqueError("설정값 누락");
  }

  return {
    realtimeBaseUrl,
    openF1BaseUrl: process.env.OPENF1_BASE_URL ?? "https://api.openf1.org/v1",
    openF1ApiKey,
    pollMs,
    retryBackoffMultiplier: asMultiplier(process.env.WORKER_RETRY_BACKOFF_MULTIPLIER, 2),
    retryBackoffMaxMs,
    realtimePostTimeoutMs: asNumber(process.env.WORKER_REALTIME_POST_TIMEOUT_MS, 3000),
    dataSource,
    internalApiToken
  };
};
