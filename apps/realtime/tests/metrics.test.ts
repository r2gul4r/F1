import { describe, expect, it } from "vitest";
import { createMetrics } from "../src/metrics.js";

describe("metrics", () => {
  it("핵심 metric들을 registry에 등록함", async () => {
    const metrics = createMetrics();
    const output = await metrics.registry.metrics();

    expect(output).toContain("telemetry_lag_ms");
    expect(output).toContain("ai_inference_ms");
    expect(output).toContain("ai_fallback_count");
    expect(output).toContain("ws_broadcast_count");
    expect(output).toContain("ws_replay_delivery_count");
    expect(output).toContain("session_sync_count");
  });

  it("label metric이 기대 라벨 조합으로 기록됨", async () => {
    const metrics = createMetrics();

    metrics.telemetryLagMs.labels("worker").observe(1200);
    metrics.aiInferenceMs.labels("fallback", "disabled").observe(50);
    metrics.aiFallbacks.labels("disabled_provider", "disabled").inc();

    const output = await metrics.registry.metrics();

    expect(output).toContain("telemetry_lag_ms_bucket{le=\"200\",source=\"worker\"}");
    expect(output).toContain("ai_inference_ms_count{status=\"fallback\",provider=\"disabled\"} 1");
    expect(output).toContain("ai_fallback_count{reason=\"disabled_provider\",provider=\"disabled\"} 1");
  });
});
