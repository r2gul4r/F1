import { describe, expect, it } from "vitest";
import { REPLAY_DEMO_SESSION_ID, buildReplayDemoSnapshot } from "../src/index.js";

describe("replay demo snapshot", () => {
  it("builds a fixed replay snapshot with drivers, telemetry, flag, and predictions", () => {
    const baseNowMs = new Date("2026-03-18T12:00:00.000Z").getTime();
    const snapshot = buildReplayDemoSnapshot(baseNowMs);

    expect(snapshot.sessionId).toBe(REPLAY_DEMO_SESSION_ID);
    expect(snapshot.drivers).toHaveLength(4);
    expect(snapshot.flag?.flagType).toBe("GREEN");
    expect(snapshot.flag?.timestampMs).toBe(baseNowMs - 700);
    expect(snapshot.latestTicksByDriver.NOR?.rank).toBe(1);
    expect(snapshot.latestTicksByDriver.NOR?.timestampMs).toBe(baseNowMs - 1_200);
    expect(snapshot.predictions.map((prediction) => prediction.lap)).toEqual([26, 27]);
    expect(snapshot.predictions[1]?.timestampMs).toBe(baseNowMs);
  });
});
