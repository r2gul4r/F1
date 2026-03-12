import {
  authSessionResponseSchema,
  OpaqueError,
  OAuthLoginRequest,
  oauthLoginRequestSchema,
  oauthLoginResponseSchema
} from "@f1/shared";

const realtimeLoginPath = "/api/v1/auth/oauth/login";
const realtimeAuthSessionPath = "/api/v1/auth/session";

const isPlaceholderSecret = (value: string): boolean =>
  [
    "replace-this-token",
    "replace-with-strong-oauth-proxy-token-32chars",
    "change-me",
    "your-token-here",
    "token"
  ].includes(value.trim().toLowerCase());

const readOAuthProxyToken = (): string => {
  const value = process.env.OAUTH_PROXY_TOKEN;
  if (!value || value.trim().length < 24 || isPlaceholderSecret(value)) {
    throw new OpaqueError("요청 처리 실패");
  }

  return value.trim();
};

const readRealtimeBaseUrl = (): string => {
  const value = process.env.REALTIME_BASE_URL ?? process.env.NEXT_PUBLIC_REALTIME_HTTP_BASE ?? "http://localhost:4001";
  const normalized = value.trim().replace(/\/$/, "");

  try {
    return new URL(normalized).toString().replace(/\/$/, "");
  } catch {
    throw new OpaqueError("요청 처리 실패");
  }
};

export class OAuthLoginBridgeError extends Error {
  constructor(public readonly status: number) {
    super("요청 처리 실패");
    this.name = "OAuthLoginBridgeError";
  }
}

export const requestWatchSession = async (body: unknown) => {
  const payload: OAuthLoginRequest = oauthLoginRequestSchema.parse(body);
  const response = await fetch(`${readRealtimeBaseUrl()}${realtimeLoginPath}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-oauth-token": readOAuthProxyToken()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new OAuthLoginBridgeError(response.status === 403 ? 403 : 502);
  }

  const json = await response.json();
  return oauthLoginResponseSchema.parse(json);
};

export const requestAuthSession = async (watchToken: string) => {
  if (watchToken.trim().length === 0) {
    throw new OAuthLoginBridgeError(403);
  }

  const response = await fetch(`${readRealtimeBaseUrl()}${realtimeAuthSessionPath}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      "x-watch-token": watchToken
    }
  });

  if (!response.ok) {
    throw new OAuthLoginBridgeError(response.status === 403 ? 403 : 502);
  }

  const json = await response.json();
  return authSessionResponseSchema.parse(json);
};
