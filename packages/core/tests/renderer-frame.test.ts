import { describe, expect, it } from "vitest";
import { Driver, SessionSnapshot, buildRendererFrame, createSessionSnapshot, reduceSessionSnapshot } from "../src/index.js";

const sessionId = "desktop-session";

const drivers: Driver[] = [
  {
    id: "VER",
    sessionId,
    fullName: "Max Verstappen",
    number: 1,
    teamName: "Red Bull",
    deepLink: "https://example.com/ver"
  },
  {
    id: "NOR",
    sessionId,
    fullName: "Lando Norris",
    number: 4,
    teamName: "McLaren",
    deepLink: "https://example.com/nor"
  }
];

const toSnapshot = (): SessionSnapshot => {
  let snapshot = createSessionSnapshot(sessionId);
  snapshot = reduceSessionSnapshot(snapshot, {
    type: "drivers.set",
    drivers
  });
  snapshot = reduceSessionSnapshot(snapshot, {
    type: "telemetry.upsert",
    tick: {
      sessionId,
      driverId: "VER",
      position: { x: 100, y: 20, z: 0 },
      speedKph: 310,
      lap: 4,
      rank: 1,
      timestampMs: 1_000
    }
  });
  snapshot = reduceSessionSnapshot(snapshot, {
    type: "telemetry.upsert",
    tick: {
      sessionId,
      driverId: "NOR",
      position: { x: -80, y: -10, z: 0 },
      speedKph: 302,
      lap: 4,
      rank: 2,
      timestampMs: 1_000
    }
  });

  return snapshot;
};

describe("renderer frame", () => {
  it("freshness summary keeps fresh/stale/no-telemetry priority ordering", () => {
    const snapshot = toSnapshot();
    const frame = buildRendererFrame({
      nowMs: 1_500,
      telemetryStaleMs: 1_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: false },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    expect(frame.cars.find((car) => car.driverId === "VER")?.freshness).toBe("fresh");

    const staleFrame = buildRendererFrame({
      nowMs: 2_500,
      telemetryStaleMs: 1_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: frame.carsByDriver,
      camera: frame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    expect(staleFrame.cars.find((car) => car.driverId === "VER")?.freshness).toBe("stale");
  });

  it("selected car gets halo emphasis and focus camera lerp", () => {
    const snapshot = toSnapshot();
    const frame = buildRendererFrame({
      nowMs: 1_500,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: true },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const selected = frame.cars.find((car) => car.driverId === "VER");

    expect(selected?.visual.selected).toBe(true);
    expect(selected?.visual.haloOpacity).toBeGreaterThan(0);
    expect(frame.camera.x).toBeGreaterThan(0);
  });

  it("freshness lowers non-selected car opacity as telemetry gets stale", () => {
    const snapshot = toSnapshot();
    const freshFrame = buildRendererFrame({
      nowMs: 1_500,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: false },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const staleFrame = buildRendererFrame({
      nowMs: 20_000,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: freshFrame.carsByDriver,
      camera: freshFrame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const freshOther = freshFrame.cars.find((car) => car.driverId === "NOR");
    const staleOther = staleFrame.cars.find((car) => car.driverId === "NOR");

    expect(freshOther?.freshness).toBe("fresh");
    expect(staleOther?.freshness).toBe("stale");
    expect(staleOther?.visual.opacity ?? 0).toBeLessThan(freshOther?.visual.opacity ?? 1);
    expect(staleOther?.visual.scale ?? 0).toBeLessThan(freshOther?.visual.scale ?? 1);
  });

  it("stale selected car stays focused while freshness dims its visuals", () => {
    const snapshot = toSnapshot();
    const refreshedSnapshot = reduceSessionSnapshot(snapshot, {
      type: "telemetry.upsert",
      tick: {
        sessionId,
        driverId: "VER",
        position: { x: 100, y: 20, z: 0 },
        speedKph: 310,
        lap: 4,
        rank: 1,
        timestampMs: 20_000
      }
    });

    const freshFrame = buildRendererFrame({
      nowMs: 20_000,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot: refreshedSnapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: true },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const staleFrame = buildRendererFrame({
      nowMs: 20_000,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: freshFrame.carsByDriver,
      camera: freshFrame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const freshSelected = freshFrame.cars.find((car) => car.driverId === "VER");
    const staleSelected = staleFrame.cars.find((car) => car.driverId === "VER");

    expect(staleSelected?.freshness).toBe("stale");
    expect(staleSelected?.visual.selected).toBe(true);
    expect(staleSelected?.visual.focus).toBe(true);
    expect(staleSelected?.visual.haloOpacity ?? 0).toBeGreaterThan(0);
    expect(staleSelected?.visual.haloOpacity ?? 0).toBeLessThan(freshSelected?.visual.haloOpacity ?? 1);
    expect(staleSelected?.visual.haloScale ?? 0).toBeLessThan(freshSelected?.visual.haloScale ?? 1);
    expect(staleSelected?.visual.opacity ?? 0).toBeLessThan(freshSelected?.visual.opacity ?? 1);
  });

  it("smoothed position lerps from the previous rendered frame", () => {
    const snapshot = toSnapshot();
    const firstFrame = buildRendererFrame({
      nowMs: 1_500,
      telemetryStaleMs: 15_000,
      selectedDriverId: null,
      snapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: false },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const movedSnapshot = reduceSessionSnapshot(snapshot, {
      type: "telemetry.upsert",
      tick: {
        sessionId,
        driverId: "VER",
        position: { x: 130, y: 30, z: 0 },
        speedKph: 314,
        lap: 4,
        rank: 1,
        timestampMs: 1_600
      }
    });

    const secondFrame = buildRendererFrame({
      nowMs: 1_650,
      telemetryStaleMs: 15_000,
      selectedDriverId: null,
      snapshot: movedSnapshot,
      previousCarsByDriver: firstFrame.carsByDriver,
      camera: firstFrame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const movedCar = secondFrame.cars.find((car) => car.driverId === "VER");
    expect(movedCar?.smoothedPosition?.x).toBeGreaterThan(100);
    expect(movedCar?.smoothedPosition?.x).toBeLessThan(130);
  });

  it("focus camera falls back to the previous selected position when the selected driver drops out of the snapshot", () => {
    const snapshot = toSnapshot();
    const firstFrame = buildRendererFrame({
      nowMs: 1_500,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: true },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const snapshotWithoutSelectedDriver = reduceSessionSnapshot(createSessionSnapshot(sessionId), {
      type: "drivers.set",
      drivers: drivers.filter((driver) => driver.id !== "VER")
    });

    const secondFrame = buildRendererFrame({
      nowMs: 1_650,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot: snapshotWithoutSelectedDriver,
      previousCarsByDriver: firstFrame.carsByDriver,
      camera: firstFrame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const previousSelected = firstFrame.cars.find((car) => car.driverId === "VER");
    const expectedCameraX =
      (firstFrame.camera.x ?? 0) + (((previousSelected?.smoothedPosition?.x ?? 0) - (firstFrame.camera.x ?? 0)) * 0.08);

    expect(secondFrame.camera.x).toBeCloseTo(expectedCameraX, 4);
    expect(secondFrame.cars.find((car) => car.driverId === "VER")).toBeUndefined();
  });

  it("no-telemetry selected car keeps focus and halo while dimming against a same-pulse fresh reference", () => {
    const snapshot = toSnapshot();
    const firstFrame = buildRendererFrame({
      nowMs: 1_500,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot,
      previousCarsByDriver: {},
      camera: { x: 0, y: 0, focusModeEnabled: true },
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const freshReferenceSnapshot = reduceSessionSnapshot(snapshot, {
      type: "telemetry.upsert",
      tick: {
        sessionId,
        driverId: "VER",
        position: { x: 100, y: 20, z: 0 },
        speedKph: 310,
        lap: 4,
        rank: 1,
        timestampMs: 1_650
      }
    });

    const freshReferenceFrame = buildRendererFrame({
      nowMs: 1_650,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot: freshReferenceSnapshot,
      previousCarsByDriver: firstFrame.carsByDriver,
      camera: firstFrame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const snapshotWithoutSelectedTick = reduceSessionSnapshot(createSessionSnapshot(sessionId), {
      type: "drivers.set",
      drivers
    });

    const noTelemetryFrame = buildRendererFrame({
      nowMs: 1_650,
      telemetryStaleMs: 15_000,
      selectedDriverId: "VER",
      snapshot: snapshotWithoutSelectedTick,
      previousCarsByDriver: firstFrame.carsByDriver,
      camera: firstFrame.camera,
      track: {
        center: { x: 0, y: 0 },
        halfHeight: 160,
        points: []
      }
    });

    const freshSelected = freshReferenceFrame.cars.find((car) => car.driverId === "VER");
    const noTelemetrySelected = noTelemetryFrame.cars.find((car) => car.driverId === "VER");

    expect(noTelemetrySelected?.freshness).toBe("no telemetry");
    expect(noTelemetrySelected?.visual.selected).toBe(true);
    expect(noTelemetrySelected?.visual.focus).toBe(true);
    expect(noTelemetrySelected?.visual.haloOpacity ?? 0).toBeGreaterThan(0);
    expect(noTelemetrySelected?.visual.haloOpacity ?? 0).toBeLessThan(freshSelected?.visual.haloOpacity ?? 1);
    expect(noTelemetrySelected?.visual.haloScale ?? 0).toBeLessThan(freshSelected?.visual.haloScale ?? 1);
    expect(noTelemetrySelected?.visual.opacity ?? 0).toBeLessThan(freshSelected?.visual.opacity ?? 1);
  });
});
