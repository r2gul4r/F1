import { Server } from "http";
import {
  aiPredictRequestSchema,
  driverSchema,
  oauthLoginRequestSchema,
  raceFlagSchema,
  sessionSchema,
  telemetryRecentQuerySchema,
  telemetryTickSchema,
  toOpaqueError
} from "@f1/shared";
import { createWatchToken, verifyWatchToken } from "@f1/shared/watch-token";
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
  ollamaBaseUrl: string;
  ollamaModel: string;
};

const internalUnauthorized = {
  message: "요청 처리 실패"
};

const checkInternalToken = (token: string, expected: string): boolean => token.length > 0 && token === expected;
const checkOAuthToken = (token: string, expected: string): boolean => token.length > 0 && token === expected;
const checkWatchToken = (token: string, secret: string): boolean => token.length > 0 && verifyWatchToken(token, secret);
const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean =>
  !origin || allowedOrigins.includes(origin);

export const buildServer = async (input: BuildServerInput): Promise<{
  app: ReturnType<typeof Fastify>;
  httpServer: Server;
}> => {
  const app = Fastify({ logger: true });
  const metrics = createMetrics();
  const tracker = new TriggerTracker();
  const aiService = new AiService({
    baseUrl: input.ollamaBaseUrl,
    model: input.ollamaModel
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin, input.allowedOrigins));
    }
  });
  const hub = new WsHub(app.server, {
    bufferSize: input.wsBufferSize,
    watchTokenSecret: input.watchTokenSecret,
    allowedOrigins: input.allowedOrigins
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
    const accessToken = createWatchToken(input.watchTokenSecret, input.watchTokenTtlSec);

    return {
      accessToken,
      tokenType: "Bearer" as const,
      expiresInSec: input.watchTokenTtlSec,
      user
    };
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
    const prediction = await aiService.predict(body);
    await input.repository.savePrediction(prediction);
    hub.broadcast({ type: "ai.prediction", payload: prediction });
    metrics.aiInferenceMs.labels("ok").observe(prediction.modelLatencyMs);
    metrics.wsBroadcasts.inc();

    return prediction;
  });

  app.post("/internal/session", async (request, reply) => {
    const token = String(request.headers["x-internal-token"] ?? "");
    if (!checkInternalToken(token, input.internalApiToken)) {
      return reply.status(403).send(internalUnauthorized);
    }

    const raw = request.body as { session: unknown; drivers: unknown };
    const session = sessionSchema.parse(raw.session);
    const drivers = (Array.isArray(raw.drivers) ? raw.drivers : []).map((driver) => driverSchema.parse(driver));

    await input.repository.upsertSession(session);
    await input.repository.upsertDrivers(drivers);

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
      const prediction = await aiService.predict({
        sessionId: trigger.sessionId,
        lap: trigger.lap,
        triggerDriverId: trigger.triggerDriverId,
        snapshot: {
          ticks,
          note: `rank ${trigger.beforeRank} -> ${trigger.afterRank}`
        }
      });

      await input.repository.savePrediction(prediction);
      hub.broadcast({ type: "ai.prediction", payload: prediction });
      metrics.aiInferenceMs.labels("ok").observe(prediction.modelLatencyMs);
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
