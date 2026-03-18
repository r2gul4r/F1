import { describe, expect, it } from "vitest";
import { REPLAY_DEMO_SESSION_ID, buildReplayDemoSnapshot } from "../src/index.js";

describe("replay demo snapshot", () => {
  it("builds a fixed replay snapshot with drivers, telemetry, flag, and predictions", () => {
    const snapshot = buildReplayDemoSnapshot();

    expect(snapshot.sessionId).toBe(REPLAY_DEMO_SESSION_ID);
    expect(snapshot.drivers).toHaveLength(4);
    expect(snapshot.flag?.flagType).toBe("GREEN");
    expect(snapshot.latestTicksByDriver.NOR?.rank).toBe(1);
    expect(snapshot.predictions.map((prediction) => prediction.lap)).toEqual([26, 27]);
  });
});
