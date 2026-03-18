export const getNextSelectedDriverId = (
  driverIds: string[],
  currentDriverId: string | null,
  direction: "previous" | "next"
): string | null => {
  if (driverIds.length === 0) {
    return null;
  }

  if (!currentDriverId) {
    return direction === "previous" ? driverIds[driverIds.length - 1] ?? null : driverIds[0] ?? null;
  }

  const currentIndex = driverIds.indexOf(currentDriverId);
  if (currentIndex < 0) {
    return direction === "previous" ? driverIds[driverIds.length - 1] ?? null : driverIds[0] ?? null;
  }

  const offset = direction === "previous" ? -1 : 1;
  const nextIndex = (currentIndex + offset + driverIds.length) % driverIds.length;
  return driverIds[nextIndex] ?? null;
};

export const isFocusToggleKey = (key: string): boolean => key.toLowerCase() === "f";
