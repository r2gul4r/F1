import { createHmac, timingSafeEqual } from "crypto";

export type WatchTokenSession =
  | {
      kind: "anonymous";
    }
  | {
      kind: "oauth";
      userId: string;
      displayName: string;
    };

export type WatchTokenPayload = {
  scope: "watch";
  iat: number;
  exp: number;
  session: WatchTokenSession;
};

const base64UrlEncode = (input: string): string =>
  Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

const sign = (encodedPayload: string, secret: string): string =>
  createHmac("sha256", secret).update(encodedPayload).digest("hex");

const normalizeSession = (session: WatchTokenSession | undefined): WatchTokenSession => {
  if (!session || session.kind === "anonymous") {
    return { kind: "anonymous" };
  }

  const userId = session.userId.trim();
  const displayName = session.displayName.trim();
  if (userId.length === 0 || displayName.length === 0) {
    return { kind: "anonymous" };
  }

  return {
    kind: "oauth",
    userId,
    displayName
  };
};

const parseWatchTokenPayload = (token: string, secret: string): WatchTokenPayload | null => {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return null;
    }

    const expected = sign(encodedPayload, secret);
    const left = Buffer.from(signature, "utf8");
    const right = Buffer.from(expected, "utf8");
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<WatchTokenPayload>;
    if (payload.scope !== "watch" || !Number.isFinite(payload.exp) || Number(payload.exp) <= Date.now()) {
      return null;
    }

    return {
      scope: "watch",
      iat: Number.isFinite(payload.iat) ? Number(payload.iat) : 0,
      exp: Number(payload.exp),
      session: normalizeSession(payload.session)
    };
  } catch {
    return null;
  }
};

export const createWatchToken = (
  secret: string,
  ttlSeconds = 60 * 60,
  session?: WatchTokenSession
): string => {
  const now = Date.now();
  const payload: WatchTokenPayload = {
    scope: "watch",
    iat: now,
    exp: now + ttlSeconds * 1000,
    session: normalizeSession(session)
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
};

export const readWatchToken = (token: string, secret: string): WatchTokenPayload | null =>
  parseWatchTokenPayload(token, secret);

export const verifyWatchToken = (token: string, secret: string): boolean => readWatchToken(token, secret) !== null;
