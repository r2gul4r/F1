export type DriverVisualState = {
  haloOpacity: number;
  haloScale: number;
  opacity: number;
  scale: number;
};

export type CameraTarget = {
  x: number;
  y: number;
};

type DriverTickPosition = {
  position: {
    x: number;
    y: number;
  };
};

export const getDriverVisualState = (input: {
  driverId: string;
  elapsedMs?: number;
  selectedDriverId: string | null;
}): DriverVisualState => {
  if (!input.selectedDriverId) {
    return {
      haloOpacity: 0,
      haloScale: 0,
      opacity: 1,
      scale: 1
    };
  }

  if (input.driverId === input.selectedDriverId) {
    const pulse = (Math.sin((input.elapsedMs ?? 0) * 0.008) + 1) * 0.5;
    return {
      haloOpacity: 0.24 + pulse * 0.28,
      haloScale: 1.84 + pulse * 0.34,
      opacity: 1,
      scale: 1.55
    };
  }

  return {
    haloOpacity: 0,
    haloScale: 0,
    opacity: 0.32,
    scale: 0.78
  };
};

export const getCameraTarget = (input: {
  focusModeEnabled: boolean;
  selectedDriverId: string | null;
  selectedDriverTick: DriverTickPosition | null;
}): CameraTarget => {
  if (!input.focusModeEnabled) {
    return {
      x: 0,
      y: 0
    };
  }

  if (!input.selectedDriverId || !input.selectedDriverTick) {
    return {
      x: 0,
      y: 0
    };
  }

  return {
    x: input.selectedDriverTick.position.x,
    y: input.selectedDriverTick.position.y
  };
};
