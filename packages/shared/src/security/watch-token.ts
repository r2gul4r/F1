import { createHmac, timingSafeEqual } from "crypto";

type WatchTokenPayload = {
  scope: "watch";
  exp: number;
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

export const createWatchToken = (secret: string, ttlSeconds = 60 * 60): string => {
  const payload: WatchTokenPayload = {
    scope: "watch",
    exp: Date.now() + ttlSeconds * 1000
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
};

export const verifyWatchToken = (token: string, secret: string): boolean => {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return false;
    }

    const expected = sign(encodedPayload, secret);
    const left = Buffer.from(signature, "utf8");
    const right = Buffer.from(expected, "utf8");
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return false;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as WatchTokenPayload;
    return payload.scope === "watch" && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
};
