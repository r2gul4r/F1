"use client";

import React, { useEffect } from "react";
import { buildReplayDemoSnapshot } from "@f1/core";
import { WatchClient } from "@/src/components/watch-client";
import { useRaceStore } from "@/src/store/use-race-store";

export const WatchReplayClient = () => {
  useEffect(() => {
    const snapshot = buildReplayDemoSnapshot();
    useRaceStore.setState({
      drivers: snapshot.drivers.map((driver) => ({ ...driver })),
      ticksByDriver: { ...snapshot.latestTicksByDriver },
      selectedDriverId: snapshot.drivers[0]?.id ?? null,
      flag: snapshot.flag ? { ...snapshot.flag } : null,
      predictions: snapshot.predictions.map((prediction) => ({ ...prediction })),
      fps: 0
    });

    return () => {
      useRaceStore.getState().resetSessionState();
      useRaceStore.getState().setFps(0);
    };
  }, []);

  return <WatchClient previewMode sessionId="desktop-replay-session" watchToken="replay-token" />;
};
