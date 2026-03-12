import { describe, expect, it } from "vitest";
import { normalizeOpenF1TelemetryTicks } from "../src/rules/openf1-normalization.js";

describe("normalizeOpenF1TelemetryTicks", () => {
  it("드라이버별 최신 location만 남기고 speed 기준 rank를 계산함", () => {
    const ticks = normalizeOpenF1TelemetryTicks({
      sessionId: "session-1",
      drivers: [
        {
          id: "VER",
          sessionId: "session-1",
          fullName: "Max Verstappen",
          number: 1,
          teamName: "Red Bull",
          deepLink: "https://example.com/ver"
        },
        {
          id: "NOR",
          sessionId: "session-1",
          fullName: "Lando Norris",
          number: 4,
          teamName: "McLaren",
          deepLink: "https://example.com/nor"
        }
      ],
      locationRows: [
        {
          date: "2026-03-12T00:00:01.000Z",
          x: 10,
          y: 20,
          z: 0,
          speed: 280,
          driver_number: 1
        },
        {
          date: "2026-03-12T00:00:02.000Z",
          x: 30,
          y: 40,
          z: 0,
          speed: 300,
          driver_number: 4
        },
        {
          date: "2026-03-12T00:00:03.000Z",
          x: 50,
          y: 60,
          z: 0,
          speed: 310,
          driver_number: 1
        },
        {
          date: "2026-03-12T00:00:04.000Z",
          x: 55,
          y: 65,
          z: 0,
          speed: 305,
          driver_number: 1
        }
      ]
    });

    expect(ticks).toHaveLength(2);
    expect(ticks).toEqual([
      {
        sessionId: "session-1",
        driverId: "VER",
        position: {
          x: 55,
          y: 65,
          z: 0
        },
        speedKph: 305,
        lap: 0,
        rank: 1,
        timestampMs: new Date("2026-03-12T00:00:04.000Z").getTime()
      },
      {
        sessionId: "session-1",
        driverId: "NOR",
        position: {
          x: 30,
          y: 40,
          z: 0
        },
        speedKph: 300,
        lap: 0,
        rank: 2,
        timestampMs: new Date("2026-03-12T00:00:02.000Z").getTime()
      }
    ]);
  });
});
