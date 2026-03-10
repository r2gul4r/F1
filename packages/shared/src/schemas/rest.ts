import { z } from "zod";
import { telemetryTickSchema } from "./ws-events.js";

export const sessionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startsAt: z.string().datetime(),
  isCurrent: z.boolean()
});

export const driverSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  fullName: z.string().min(1),
  number: z.number().int().nonnegative(),
  teamName: z.string().min(1),
  deepLink: z.string().url()
});

export const telemetryRecentQuerySchema = z.object({
  windowSec: z.coerce.number().int().min(1).max(600).default(30)
});

export const aiPredictRequestSchema = z.object({
  sessionId: z.string().min(1),
  lap: z.number().int().nonnegative(),
  triggerDriverId: z.string().min(1),
  snapshot: z.object({
    ticks: z.array(telemetryTickSchema).max(200),
    note: z.string().max(1000).optional()
  })
});

export const oauthLoginRequestSchema = z.object({
  provider: z.string().min(1).max(50),
  providerUserId: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
  email: z.string().email().max(320).optional(),
  avatarUrl: z.string().url().max(2000).optional()
});

export const oauthLoginResponseSchema = z.object({
  accessToken: z.string().min(10),
  tokenType: z.literal("Bearer"),
  expiresInSec: z.number().int().positive(),
  user: z.object({
    userId: z.string().min(1),
    provider: z.string().min(1),
    providerUserId: z.string().min(1),
    displayName: z.string().min(1),
    email: z.string().email().max(320).nullable(),
    avatarUrl: z.string().url().max(2000).nullable()
  })
});

export type Session = z.infer<typeof sessionSchema>;
export type Driver = z.infer<typeof driverSchema>;
export type TelemetryRecentQuery = z.infer<typeof telemetryRecentQuerySchema>;
export type AiPredictRequest = z.infer<typeof aiPredictRequestSchema>;
export type OAuthLoginRequest = z.infer<typeof oauthLoginRequestSchema>;
export type OAuthLoginResponse = z.infer<typeof oauthLoginResponseSchema>;
