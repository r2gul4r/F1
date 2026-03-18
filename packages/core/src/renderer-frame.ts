import { CameraState, CarState, CarVisualState, FreshnessSummary, RendererFrameInput } from "./contracts.js";

const DEFAULT_INTERPOLATION_ALPHA = 0.2;
const FOCUS_CAMERA_ALPHA = 0.08;
const RESET_CAMERA_ALPHA = 0.05;

export type RendererFrameState = {
  camera: CameraState;
  cars: CarState[];
  carsByDriver: Record<string, CarState>;
};

const lerp = (from: number, to: number, alpha: number): number => from + (to - from) * alpha;

export const resolveFreshnessSummary = (
  timestampMs: number | undefined,
  nowMs: number,
  telemetryStaleMs: number
): FreshnessSummary => {
  if (typeof timestampMs !== "number") {
    return {
      freshness: "no telemetry",
      isStale: false,
      priority: 2,
      staleAfterMs: null
    };
  }

  const isStale = nowMs - timestampMs > telemetryStaleMs;
  return {
    freshness: isStale ? "stale" : "fresh",
    isStale,
    priority: isStale ? 1 : 0,
    staleAfterMs: timestampMs + telemetryStaleMs
  };
};

export const resolveCarVisualState = (input: {
  driverId: string;
  selectedDriverId: string | null;
  nowMs: number;
}): CarVisualState => {
  if (!input.selectedDriverId) {
    return {
      selected: false,
      focus: false,
      haloOpacity: 0,
      haloScale: 0,
      opacity: 1,
      scale: 1
    };
  }

  if (input.driverId === input.selectedDriverId) {
    const pulse = (Math.sin(input.nowMs * 0.008) + 1) * 0.5;
    return {
      selected: true,
      focus: true,
      haloOpacity: 0.22 + pulse * 0.3,
      haloScale: 1.7 + pulse * 0.28,
      opacity: 1,
      scale: 1.35
    };
  }

  return {
    selected: false,
    focus: false,
    haloOpacity: 0,
    haloScale: 0,
    opacity: 0.4,
    scale: 0.88
  };
};

const toSmoothedPosition = (
  previousCar: CarState | undefined,
  targetPosition: CarState["position"],
  freshness: FreshnessSummary["freshness"]
): CarState["smoothedPosition"] => {
  if (!targetPosition) {
    return previousCar?.smoothedPosition ?? null;
  }

  const previousPosition = previousCar?.smoothedPosition ?? previousCar?.position;
  if (!previousPosition) {
    return { ...targetPosition };
  }

  const alpha = freshness === "fresh" ? DEFAULT_INTERPOLATION_ALPHA : DEFAULT_INTERPOLATION_ALPHA * 0.55;
  return {
    x: lerp(previousPosition.x, targetPosition.x, alpha),
    y: lerp(previousPosition.y, targetPosition.y, alpha),
    z: lerp(previousPosition.z, targetPosition.z, alpha)
  };
};

export const buildRendererFrame = (input: RendererFrameInput): RendererFrameState => {
  const cars = input.snapshot.drivers.map((driver) => {
    const tick = input.snapshot.latestTicksByDriver[driver.id];
    const previousCar = input.previousCarsByDriver[driver.id];
    const freshnessSummary = resolveFreshnessSummary(tick?.timestampMs, input.nowMs, input.telemetryStaleMs);
    const position = tick ? { ...tick.position } : previousCar?.position ?? null;

    const car: CarState = {
      driverId: driver.id,
      rank: tick?.rank ?? previousCar?.rank ?? null,
      speedKph: tick?.speedKph ?? previousCar?.speedKph ?? null,
      position,
      smoothedPosition: toSmoothedPosition(previousCar, position, freshnessSummary.freshness),
      freshness: freshnessSummary.freshness,
      visual: resolveCarVisualState({
        driverId: driver.id,
        selectedDriverId: input.selectedDriverId,
        nowMs: input.nowMs
      })
    };

    return car;
  });

  const previousSelectedCar = input.selectedDriverId ? input.previousCarsByDriver[input.selectedDriverId] : undefined;
  const selectedCar = cars.find(
    (car) => car.driverId === input.selectedDriverId && car.smoothedPosition !== null
  );
  const fallbackFocusTarget = previousSelectedCar?.smoothedPosition ?? previousSelectedCar?.position ?? null;
  const targetCamera = input.camera.focusModeEnabled
    ? selectedCar?.smoothedPosition ?? fallbackFocusTarget ?? { x: input.track.center.x, y: input.track.center.y, z: 0 }
    : { x: input.track.center.x, y: input.track.center.y, z: 0 };
  const cameraAlpha = input.camera.focusModeEnabled ? FOCUS_CAMERA_ALPHA : RESET_CAMERA_ALPHA;

  const camera: CameraState = {
    x: lerp(input.camera.x, targetCamera.x, cameraAlpha),
    y: lerp(input.camera.y, targetCamera.y, cameraAlpha),
    focusModeEnabled: input.camera.focusModeEnabled
  };

  const carsByDriver = cars.reduce<Record<string, CarState>>((acc, car) => {
    acc[car.driverId] = car;
    return acc;
  }, {});

  return {
    camera,
    cars: [...cars].sort((left, right) => {
      if (left.visual.selected) {
        return 1;
      }

      if (right.visual.selected) {
        return -1;
      }

      return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
    }),
    carsByDriver
  };
};
