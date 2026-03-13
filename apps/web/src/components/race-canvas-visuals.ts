export type DriverVisualState = {
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
  selectedDriverId: string | null;
}): DriverVisualState => {
  if (!input.selectedDriverId) {
    return {
      opacity: 1,
      scale: 1
    };
  }

  if (input.driverId === input.selectedDriverId) {
    return {
      opacity: 1,
      scale: 1.55
    };
  }

  return {
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
