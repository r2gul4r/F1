import { REPLAY_DEMO_SESSION_ID, buildReplayDemoSnapshot, createSessionSnapshot, replayDemoDrivers } from "@f1/core";
import { useMemo, useState } from "react";

export const useReplaySession = (enabled = true) => {
  const snapshot = useMemo(
    () => (enabled ? buildReplayDemoSnapshot() : createSessionSnapshot(REPLAY_DEMO_SESSION_ID)),
    [enabled]
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(replayDemoDrivers[0]?.id ?? null);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);

  const selectedDriver = useMemo(
    () => snapshot.drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [selectedDriverId, snapshot.drivers]
  );

  return {
    snapshot,
    selectedDriver,
    selectedDriverId,
    setSelectedDriverId,
    focusModeEnabled,
    setFocusModeEnabled
  };
};
