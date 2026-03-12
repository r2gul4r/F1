export type DriverVisualState = {
  opacity: number;
  scale: number;
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
