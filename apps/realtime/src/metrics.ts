import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export type Metrics = {
  registry: Registry;
  telemetryLagMs: Histogram<"source">;
  aiInferenceMs: Histogram<"status">;
  wsBroadcasts: Counter;
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
    labelNames: ["status"],
    registers: [registry],
    buckets: [200, 500, 1000, 2000, 5000, 10000]
  });

  const wsBroadcasts = new Counter({
    name: "ws_broadcast_count",
    help: "WebSocket broadcast count",
    registers: [registry]
  });

  return {
    registry,
    telemetryLagMs,
    aiInferenceMs,
    wsBroadcasts
  };
};