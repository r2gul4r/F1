"use client";

import React, { useEffect } from "react";
import type { AiPrediction, Driver, RaceFlag, TelemetryTick } from "@f1/shared";
import { WatchClient } from "@/src/components/watch-client";
import { useRaceStore } from "@/src/store/use-race-store";

const previewSessionId = "preview-session";

const previewDrivers: Driver[] = [
  {
    id: "VER",
    sessionId: previewSessionId,
    fullName: "Max Verstappen",
    number: 1,
    teamName: "Red Bull",
    deepLink: "https://www.formula1.com/en/drivers/max-verstappen"
  },
  {
    id: "NOR",
    sessionId: previewSessionId,
    fullName: "Lando Norris",
    number: 4,
    teamName: "McLaren",
    deepLink: "https://www.formula1.com/en/drivers/lando-norris"
  },
  {
    id: "LEC",
    sessionId: previewSessionId,
    fullName: "Charles Leclerc",
    number: 16,
    teamName: "Ferrari",
    deepLink: "https://www.formula1.com/en/drivers/charles-leclerc"
  }
];

const createPreviewTicks = (): Record<string, TelemetryTick> => {
  const nowMs = Date.now();
  const ticks: TelemetryTick[] = [
    {
      sessionId: previewSessionId,
      driverId: "VER",
      position: { x: 116, y: 20, z: 0 },
      speedKph: 322,
      lap: 18,
      rank: 1,
      timestampMs: nowMs - 900
    },
    {
      sessionId: previewSessionId,
      driverId: "NOR",
      position: { x: -58, y: 93, z: 0 },
      speedKph: 317,
      lap: 18,
      rank: 2,
      timestampMs: nowMs - 700
    },
    {
      sessionId: previewSessionId,
      driverId: "LEC",
      position: { x: -102, y: -44, z: 0 },
      speedKph: 309,
      lap: 18,
      rank: 3,
      timestampMs: nowMs - 1200
    }
  ];

  return Object.fromEntries(ticks.map((tick) => [tick.driverId, tick]));
};

const createPreviewFlag = (): RaceFlag => ({
  sessionId: previewSessionId,
  flagType: "GREEN",
  sector: "S2",
  timestampMs: Date.now() - 500
});

const createPreviewPrediction = (): AiPrediction => ({
  sessionId: previewSessionId,
  lap: 18,
  triggerDriverId: "NOR",
  podiumProb: [0.74, 0.19, 0.07],
  isFallback: false,
  reasoningSummary: "프로토타입 미리보기용 예측 카드",
  modelLatencyMs: 240,
  timestampMs: Date.now() - 800
});

export const WatchPreviewClient = () => {
  useEffect(() => {
    useRaceStore.setState({
      drivers: previewDrivers.map((driver) => ({ ...driver })),
      ticksByDriver: createPreviewTicks(),
      selectedDriverId: "VER",
      flag: createPreviewFlag(),
      predictions: [createPreviewPrediction()],
      fps: 0
    });

    return () => {
      useRaceStore.getState().resetSessionState();
      useRaceStore.getState().setFps(0);
    };
  }, []);

  return <WatchClient previewMode sessionId={previewSessionId} watchToken="preview-token" />;
};
