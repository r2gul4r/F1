import { z } from "zod";

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});

export const telemetryTickSchema = z.object({
  sessionId: z.string().min(1),
  driverId: z.string().min(1),
  position: positionSchema,
  speedKph: z.number().nonnegative(),
  lap: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  timestampMs: z.number().int().positive()
});

export const raceFlagSchema = z.object({
  sessionId: z.string().min(1),
  flagType: z.enum(["GREEN", "YELLOW", "RED", "SAFETY_CAR", "VSC", "CHEQUERED"]),
  sector: z.string().optional(),
  timestampMs: z.number().int().positive()
});

export const aiPredictionSchema = z.object({
  sessionId: z.string().min(1),
  lap: z.number().int().nonnegative(),
  triggerDriverId: z.string().min(1),
  podiumProb: z.array(z.number().min(0).max(1)).length(3),
  reasoningSummary: z.string().min(1).max(500),
  modelLatencyMs: z.number().int().nonnegative(),
  timestampMs: z.number().int().positive()
});

export const wsTelemetryEventSchema = z.object({
  type: z.literal("telemetry.tick"),
  payload: telemetryTickSchema
});

export const wsRaceFlagEventSchema = z.object({
  type: z.literal("race.flag"),
  payload: raceFlagSchema
});

export const wsAiPredictionEventSchema = z.object({
  type: z.literal("ai.prediction"),
  payload: aiPredictionSchema
});

export const wsEventSchema = z.discriminatedUnion("type", [
  wsTelemetryEventSchema,
  wsRaceFlagEventSchema,
  wsAiPredictionEventSchema
]);

export type Position = z.infer<typeof positionSchema>;
export type TelemetryTick = z.infer<typeof telemetryTickSchema>;
export type RaceFlag = z.infer<typeof raceFlagSchema>;
export type AiPrediction = z.infer<typeof aiPredictionSchema>;
export type WsEvent = z.infer<typeof wsEventSchema>;