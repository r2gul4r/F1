import { describe, expect, it, vi } from "vitest";
import { buildPredictionFeatureSnapshot } from "../src/index.js";

describe("prediction feature snapshot", () => {
  it("rank transition과 speed 집계를 deterministic note로 고정함", () => {
    const snapshot = buildPredictionFeatureSnapshot({
      sessionId: "session-1",
      lap: 8,
      triggerDriverId: "NOR",
      generatedAtMs: 1234,
      rankTransition: {
        beforeRank: 6,
        afterRank: 5
      },
      ticks: [
        {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 1, y: 2, z: 0 },
          speedKph: 312,
          lap: 8,
          rank: 6,
          timestampMs: 1000
        },
        {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 2, y: 3, z: 0 },
          speedKph: 314,
          lap: 8,
          rank: 5,
          timestampMs: 1100
        }
      ]
    });

    expect(snapshot).toMatchObject({
      sessionId: "session-1",
      lap: 8,
      triggerDriverId: "NOR",
      generatedAtMs: 1234,
      tickCount: 2,
      averageSpeedKph: 313,
      topSpeedKph: 314,
      minSpeedKph: 312,
      note: "rank 6 -> 5 | ticks=2 | avg=313.0 | top=314.0 | min=312.0"
    });
  });

  it("tick이 비어 있어도 결정론적 empty feature note를 생성함", () => {
    const snapshot = buildPredictionFeatureSnapshot({
      sessionId: "session-empty",
      lap: 3,
      triggerDriverId: "VER",
      generatedAtMs: 55,
      ticks: []
    });

    expect(snapshot).toMatchObject({
      tickCount: 0,
      averageSpeedKph: 0,
      topSpeedKph: 0,
      minSpeedKph: 0,
      note: "rank n/a | ticks=0 | avg=0.0 | top=0.0 | min=0.0"
    });
  });

  it("유효한 speedKph가 하나도 없으면 0 fallback 집계를 사용함", () => {
    const snapshot = buildPredictionFeatureSnapshot({
      sessionId: "session-normalized",
      lap: 4,
      triggerDriverId: "LEC",
      ticks: [
        {
          sessionId: "session-normalized",
          driverId: "LEC",
          position: { x: 1, y: 1, z: 0 },
          speedKph: Number.NaN,
          lap: 4,
          rank: 4,
          timestampMs: 2000
        },
        {
          sessionId: "session-normalized",
          driverId: "LEC",
          position: { x: 2, y: 2, z: 0 },
          speedKph: -50,
          lap: 4,
          rank: 4,
          timestampMs: 2100
        }
      ]
    });

    expect(snapshot.averageSpeedKph).toBe(0);
    expect(snapshot.tickCount).toBe(0);
    expect(snapshot.note).toContain("avg=0.0");
  });

  it("mixed valid/invalid speedKph에서는 유효한 speed만 집계함", () => {
    const snapshot = buildPredictionFeatureSnapshot({
      sessionId: "session-mixed",
      lap: 9,
      triggerDriverId: "VER",
      ticks: [
        {
          sessionId: "session-mixed",
          driverId: "VER",
          position: { x: 1, y: 1, z: 0 },
          speedKph: 320,
          lap: 9,
          rank: 1,
          timestampMs: 3000
        },
        {
          sessionId: "session-mixed",
          driverId: "VER",
          position: { x: 2, y: 2, z: 0 },
          speedKph: Number.NaN,
          lap: 9,
          rank: 1,
          timestampMs: 3100
        },
        {
          sessionId: "session-mixed",
          driverId: "VER",
          position: { x: 3, y: 3, z: 0 },
          speedKph: 300,
          lap: 9,
          rank: 1,
          timestampMs: 3200
        },
        {
          sessionId: "session-mixed",
          driverId: "VER",
          position: { x: 4, y: 4, z: 0 },
          speedKph: -5,
          lap: 9,
          rank: 1,
          timestampMs: 3300
        }
      ]
    });

    expect(snapshot.tickCount).toBe(2);
    expect(snapshot.averageSpeedKph).toBe(310);
    expect(snapshot.topSpeedKph).toBe(320);
    expect(snapshot.minSpeedKph).toBe(300);
    expect(snapshot.note).toContain("ticks=2");
    expect(snapshot.note).toContain("avg=310.0");
    expect(snapshot.note).toContain("min=300.0");
  });

  it("generatedAtMs가 없으면 feature build 시각으로 채움", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T10:10:00.000Z"));

    try {
      const snapshot = buildPredictionFeatureSnapshot({
        sessionId: "session-time",
        lap: 5,
        triggerDriverId: "HAM",
        ticks: []
      });

      expect(snapshot.generatedAtMs).toBe(new Date("2026-03-18T10:10:00.000Z").getTime());
    } finally {
      vi.useRealTimers();
    }
  });
});
