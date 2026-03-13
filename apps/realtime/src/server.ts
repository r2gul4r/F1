import { Server } from "http";
import {
  aiPredictRequestSchema,
  authSessionResponseSchema,
  driverSchema,
  internalSessionSyncRequestSchema,
  oauthLoginRequestSchema,
  raceFlagSchema,
  sessionSchema,
  telemetryRecentQuerySchema,
  telemetryTickSchema,
  toOpaqueError
} from "@f1/shared";
import { createWatchToken, readWatchToken, verifyWatchToken } from "@f1/shared/watch-token";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { createMetrics } from "./metrics.js";
import { AiService } from "./services/ai-service.js";
import { TriggerTracker } from "./services/trigger-tracker.js";
import { OAuthUser, UpsertOAuthIdentityInput } from "./store/oauth-user-repository.js";
import { Repository } from "./store/repository.js";
import { WsHub } from "./ws/hub.js";

type OAuthUserRepository = {
  upsertIdentity(input: UpsertOAuthIdentityInput): Promise<OAuthUser>;
};

export type BuildServerInput = {
  repository: Repository;
  oauthUserRepository: OAuthUserRepository;
  internalApiToken: string;
  oauthProxyToken: string;
  watchTokenSecret: string;
  watchTokenTtlSec: number;
  allowedOrigins: string[];
  wsBufferSize: number;
  aiRequestTimeoutMs?: number;
  aiProvider?: "ollama" | "gemini" | "disabled";
  ollamaBaseUrl: string;
  ollamaModel: string;
  geminiApiKey?: string;
  geminiModel?: string;
};

const internalUnauthorized = {
  message: "요청 처리 실패"
};

const checkInternalToken = (token: string, expected: string): boolean => token.length > 0 && token === expected;
const checkOAuthToken = (token: string, expected: string): boolean => token.length > 0 && token === expected;
const checkWatchToken = (token: string, secret: string): boolean => token.length > 0 && verifyWatchToken(token, secret);
const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean =>
  !origin || allowedOrigins.includes(origin);
const resolveAiRequestTimeoutMs = (value: number | undefined): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return undefined;
};

export const buildServer = async (input: BuildServerInput): Promise<{
  app: ReturnType<typeof Fastify>;
  httpServer: Server;
}> => {
  const app = Fastify({ logger: true });
  const metrics = createMetrics();
  const tracker = new TriggerTracker();
  const aiProvider = input.aiProvider ?? "ollama";
  const aiService = new AiService({
    provider: aiProvider,
    baseUrl: input.ollamaBaseUrl,
    model: aiProvider === "gemini" ? input.geminiModel ?? "gemini-2.5-flash" : input.ollamaModel,
    apiKey: input.geminiApiKey,
    requestTimeoutMs: resolveAiRequestTimeoutMs(input.aiRequestTimeoutMs)
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin, input.allowedOrigins));
    }
  });
  const hub = new WsHub(app.server, {
    bufferSize: input.wsBufferSize,
    watchTokenSecret: input.watchTokenSecret,
    allowedOrigins: input.allowedOrigins,
    onConnected: () => metrics.wsConnections.inc(),
    onReconnected: () => metrics.wsReconnects.inc(),
    onRejected: () => metrics.wsRejects.inc(),
    onReplayDelivered: () => metrics.wsReplayDeliveries.inc(),
    onDroppedEventSuspected: () => metrics.wsDroppedEventSuspects.inc()
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({ message: toOpaqueError(error).publicMessage });
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.post("/api/v1/auth/oauth/login", async (request, reply) => {
    const token = String(request.headers["x-oauth-token"] ?? "");
    if (!checkOAuthToken(token, input.oauthProxyToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const payload = oauthLoginRequestSchema.parse(request.body);
    const user = await input.oauthUserRepository.upsertIdentity(payload);
    const accessToken = createWatchToken(input.watchTokenSecret, input.watchTokenTtlSec, {
      kind: "oauth",
      userId: user.userId,
      displayName: user.displayName
    });

    return {
      accessToken,
      tokenType: "Bearer" as const,
      expiresInSec: input.watchTokenTtlSec,
      user
    };
  });

  app.get("/api/v1/auth/session", async (request, reply) => {
    const token = String(request.headers["x-watch-token"] ?? "");
    const watchSession = readWatchToken(token, input.watchTokenSecret);
    if (!watchSession) {
      return reply.status(403).send(internalUnauthorized);
    }

    return authSessionResponseSchema.parse({
      tokenType: "Bearer",
      issuedAtMs: watchSession.iat,
      expiresAtMs: watchSession.exp,
      authSession: watchSession.session
    });
  });

  app.get("/metrics", async (_request, reply) => {
    const token = String(_request.headers["x-internal-token"] ?? "");
    if (!checkInternalToken(token, input.internalApiToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    reply.header("content-type", metrics.registry.contentType);
    return metrics.registry.metrics();
  });

  app.get("/api/v1/sessions/current", async (request, reply) => {
    const token = String(request.headers["x-watch-token"] ?? "");
    if (!checkWatchToken(token, input.watchTokenSecret)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const session = await input.repository.getCurrentSession();
    return session;
  });

  app.get("/api/v1/sessions/:id/drivers", async (request, reply) => {
    const token = String(request.headers["x-watch-token"] ?? "");
    if (!checkWatchToken(token, input.watchTokenSecret)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const params = request.params as { id: string };
    return input.repository.getDrivers(params.id);
  });

  app.get("/api/v1/drivers/:id/telemetry/recent", async (request, reply) => {
    const token = String(request.headers["x-watch-token"] ?? "");
    if (!checkWatchToken(token, input.watchTokenSecret)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const params = request.params as { id: string };
    const query = telemetryRecentQuerySchema.parse(request.query);
    return input.repository.getRecentTelemetry(params.id, query.windowSec);
  });

  app.post("/api/v1/ai/predict", async (request, reply) => {
    const token = String(request.headers["x-internal-token"] ?? "");
    if (!checkInternalToken(token, input.internalApiToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const body = aiPredictRequestSchema.parse(request.body);
    const result = await aiService.predictWithStatus(body);
    const prediction = result.prediction;
    await input.repository.savePrediction(prediction);
    hub.broadcast({ type: "ai.prediction", payload: prediction });
    metrics.aiInferenceMs.labels(result.status, aiProvider).observe(prediction.modelLatencyMs);
    if (result.status === "fallback" && result.reason) {
      metrics.aiFallbacks.labels(result.reason, aiProvider).inc();
    }
    metrics.wsBroadcasts.inc();

    return prediction;
  });

  app.post("/internal/session", async (request, reply) => {
    const token = String(request.headers["x-internal-token"] ?? "");
    if (!checkInternalToken(token, input.internalApiToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const payload = internalSessionSyncRequestSchema.parse(request.body);
    const session = sessionSchema.parse(payload.session);
    const drivers = payload.drivers.map((driver) => driverSchema.parse(driver));

    await input.repository.upsertSession(session);
    await input.repository.upsertDrivers(drivers);
    metrics.sessionSyncs.inc();

    return { ok: true };
  });

  app.post("/internal/events/telemetry", async (request, reply) => {
    const token = String(request.headers["x-internal-token"] ?? "");
    if (!checkInternalToken(token, input.internalApiToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const tick = telemetryTickSchema.parse(request.body);
    await input.repository.insertTelemetryTick(tick);
    hub.broadcast({ type: "telemetry.tick", payload: tick });
    metrics.wsBroadcasts.inc();
    metrics.telemetryLagMs.labels("worker").observe(Date.now() - tick.timestampMs);

    const triggers = tracker.onTick(tick);

    const tasks = triggers.map(async (trigger) => {
      const ticks = await input.repository.getRecentSessionTicks(trigger.sessionId, 80);
      const result = await aiService.predictWithStatus({
        sessionId: trigger.sessionId,
        lap: trigger.lap,
        triggerDriverId: trigger.triggerDriverId,
        snapshot: {
          ticks,
          note: `rank ${trigger.beforeRank} -> ${trigger.afterRank}`
        }
      });
      const prediction = result.prediction;

      await input.repository.savePrediction(prediction);
      hub.broadcast({ type: "ai.prediction", payload: prediction });
      metrics.aiInferenceMs.labels(result.status, aiProvider).observe(prediction.modelLatencyMs);
      if (result.status === "fallback" && result.reason) {
        metrics.aiFallbacks.labels(result.reason, aiProvider).inc();
      }
      metrics.wsBroadcasts.inc();
    });

    await Promise.all(tasks);

    return reply.status(202).send({ accepted: true });
  });

  app.post("/internal/events/flag", async (request, reply) => {
    const token = String(request.headers["x-internal-token"] ?? "");
    if (!checkInternalToken(token, input.internalApiToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const flag = raceFlagSchema.parse(request.body);
    await input.repository.insertRaceFlag(flag);
    hub.broadcast({ type: "race.flag", payload: flag });
    metrics.wsBroadcasts.inc();

    return reply.status(202).send({ accepted: true });
  });

  return { app, httpServer: app.server };
};
