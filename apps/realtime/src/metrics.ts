import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export type Metrics = {
  registry: Registry;
  telemetryLagMs: Histogram<"source">;
  aiInferenceMs: Histogram<"status" | "provider">;
  aiFallbacks: Counter<"reason" | "provider">;
  wsBroadcasts: Counter;
  wsConnections: Counter;
  wsRejects: Counter;
  wsReplayDeliveries: Counter;
  sessionSyncs: Counter;
};

export const createMetrics = (): Metrics => {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const telemetryLagMs = new Histogram({
    name: "telemetry_lag_ms",
    help: "Telemetry ingestion lag in milliseconds",
    labelNames: ["source"],
    registers: [registry],
    buckets: [200, 500, 1000, 2000, 4000, 8000]
  });

  const aiInferenceMs = new Histogram({
    name: "ai_inference_ms",
    help: "AI inference duration",
    labelNames: ["status", "provider"],
    registers: [registry],
    buckets: [200, 500, 1000, 2000, 5000, 10000]
  });

  const aiFallbacks = new Counter({
    name: "ai_fallback_count",
    help: "AI fallback count by reason",
    labelNames: ["reason", "provider"],
    registers: [registry]
  });

  const wsBroadcasts = new Counter({
    name: "ws_broadcast_count",
    help: "WebSocket broadcast count",
    registers: [registry]
  });

  const wsConnections = new Counter({
    name: "ws_connection_count",
    help: "Accepted WebSocket connection count",
    registers: [registry]
  });

  const wsRejects = new Counter({
    name: "ws_reject_count",
    help: "Rejected WebSocket connection count",
    registers: [registry]
  });

  const wsReplayDeliveries = new Counter({
    name: "ws_replay_delivery_count",
    help: "Replayed WebSocket event delivery count",
    registers: [registry]
  });

  const sessionSyncs = new Counter({
    name: "session_sync_count",
    help: "Accepted internal session sync count",
    registers: [registry]
  });

  return {
    registry,
    telemetryLagMs,
    aiInferenceMs,
    aiFallbacks,
    wsBroadcasts,
    wsConnections,
    wsRejects,
    wsReplayDeliveries,
    sessionSyncs
  };
};
