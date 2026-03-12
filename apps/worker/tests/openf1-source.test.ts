import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOpenF1Headers, OpenF1Source } from "../src/sources/openf1-source.js";

describe("openf1 source", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("api 키 헤더를 생성함", () => {
    const headers = buildOpenF1Headers("sample-key");

    expect(headers.authorization).toBe("Bearer sample-key");
    expect(headers["x-api-key"]).toBe("sample-key");
  });

  it("pull은 driver별 최신 location으로 telemetry를 정규화함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              session_key: 1001,
              session_name: "Bahrain GP",
              date_start: "2026-03-12T00:00:00.000Z"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              driver_number: 1,
              full_name: "Max Verstappen",
              team_name: "Red Bull",
              name_acronym: "VER"
            },
            {
              driver_number: 4,
              full_name: "Lando Norris",
              team_name: "McLaren",
              name_acronym: "NOR"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
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
        })
    );

    const source = new OpenF1Source("https://api.openf1.org/v1", "sample-key");
    const snapshot = await source.pull();

    expect(snapshot.session.id).toBe("1001");
    expect(snapshot.session.name).toBe("Bahrain GP");
    expect(snapshot.session.startsAt).toBe("2026-03-12T00:00:00.000Z");
    expect(snapshot.drivers.map((driver) => driver.id)).toEqual(["VER", "NOR"]);
    expect(snapshot.drivers).toMatchObject([
      {
        id: "VER",
        number: 1,
        fullName: "Max Verstappen",
        teamName: "Red Bull",
        deepLink: "https://f1tv.formula1.com/search?q=Max%20Verstappen"
      },
      {
        id: "NOR",
        number: 4,
        fullName: "Lando Norris",
        teamName: "McLaren",
        deepLink: "https://f1tv.formula1.com/search?q=Lando%20Norris"
      }
    ]);
    expect(snapshot.ticks).toEqual([
      {
        sessionId: "1001",
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
        sessionId: "1001",
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

  it("driver 필드가 비어도 최소 fallback으로 매핑함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              session_key: 1002,
              session_name: "Saudi GP",
              date_start: "2026-03-13T00:00:00.000Z"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              driver_number: 81,
              full_name: "   ",
              team_name: " ",
              name_acronym: " "
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              date: "2026-03-13T00:00:01.000Z",
              x: 10,
              y: 20,
              z: 0,
              speed: 280,
              driver_number: 81
            }
          ]
        })
    );

    const source = new OpenF1Source("https://api.openf1.org/v1", "sample-key");
    const snapshot = await source.pull();

    expect(snapshot.drivers).toMatchObject([
      {
        id: "81",
        number: 81,
        fullName: "81",
        teamName: "Unknown Team",
        deepLink: "https://f1tv.formula1.com/search?q=81"
      }
    ]);
  });

  it("driver 필드가 누락돼도 최소 fallback으로 매핑함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              session_key: 1003,
              session_name: "Australia GP",
              date_start: "2026-03-14T00:00:00.000Z"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              driver_number: 63
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              date: "2026-03-14T00:00:01.000Z",
              x: 10,
              y: 20,
              z: 0,
              speed: 281,
              driver_number: 63
            }
          ]
        })
    );

    const source = new OpenF1Source("https://api.openf1.org/v1", "sample-key");
    const snapshot = await source.pull();

    expect(snapshot.drivers).toMatchObject([
      {
        id: "63",
        number: 63,
        fullName: "63",
        teamName: "Unknown Team",
        deepLink: "https://f1tv.formula1.com/search?q=63"
      }
    ]);
  });
});
