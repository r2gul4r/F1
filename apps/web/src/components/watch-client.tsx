"use client";

import React from "react";
import { useEffect, useState } from "react";
import { DriverPanel } from "@/src/components/driver-panel";
import { HudErrorBoundary } from "@/src/components/hud-error-boundary";
import { PredictionCard } from "@/src/components/prediction-card";
import { RaceCanvas } from "@/src/components/race-canvas";
import { SelectedDriverHud } from "@/src/components/selected-driver-hud";
import { useRaceSocket } from "@/src/lib/use-race-socket";
import { useRaceStore } from "@/src/store/use-race-store";

export const WatchClient = ({
  sessionId,
  watchToken
}: {
  sessionId: string;
  watchToken: string;
}) => {
  const { status, reconnectInMs } = useRaceSocket(sessionId, watchToken);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const drivers = useRaceStore((state) => state.drivers);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const setSelectedDriverId = useRaceStore((state) => state.setSelectedDriverId);
  const flag = useRaceStore((state) => state.flag);
  const fps = useRaceStore((state) => state.fps);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);

  useEffect(() => {
    const selectedStillExists = selectedDriverId ? drivers.some((driver) => driver.id === selectedDriverId) : false;
    if (selectedStillExists) {
      return;
    }

    setSelectedDriverId(drivers[0]?.id ?? null);
  }, [drivers, selectedDriverId, setSelectedDriverId]);

  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? null;
  const orderedDrivers = [...drivers].sort((left, right) => {
    const leftRank = ticksByDriver[left.id]?.rank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = ticksByDriver[right.id]?.rank ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.number - right.number;
  });

  return (
    <main className={focusModeEnabled ? "dashboard dashboard-focus" : "dashboard"}>
      <section className="panel canvas-wrap">
        <div className="kpis">
          <div className="kpi">
            <div className="muted">연결 상태</div>
            <div>{status}</div>
          </div>
          <div className="kpi">
            <div className="muted">평균 FPS</div>
            <div>{fps.toFixed(1)}</div>
          </div>
          <div className="kpi">
            <div className="muted">플래그</div>
            <div>{flag?.flagType ?? "GREEN"}</div>
          </div>
          <div className="kpi">
            <div className="muted">선택 드라이버</div>
            <div>{selectedDriver ? `#${selectedDriver.number} ${selectedDriver.id}` : "-"}</div>
          </div>
          <div className="kpi">
            <div className="muted">드라이버 수</div>
            <div>{drivers.length}</div>
          </div>
          <button className="kpi hud-toggle" data-testid="hud-toggle" onClick={() => setHudEnabled((value) => !value)} type="button">
            <div className="muted">HUD</div>
            <div>{hudEnabled ? "HUD 끄기" : "HUD 켜기"}</div>
          </button>
          <button
            className="kpi hud-toggle"
            data-testid="focus-toggle"
            onClick={() => setFocusModeEnabled((value) => !value)}
            type="button"
          >
            <div className="muted">집중 모드</div>
            <div>{focusModeEnabled ? "집중 모드 끄기" : "집중 모드 켜기"}</div>
          </button>
        </div>
        {status !== "connected" ? <p className="muted">재연결 예정: {Math.ceil(reconnectInMs / 1000)}초</p> : null}
        <div className="hud-shell">
          {hudEnabled ? (
            <HudErrorBoundary>
              <SelectedDriverHud />
            </HudErrorBoundary>
          ) : null}
          <RaceCanvas />
        </div>
      </section>

      {focusModeEnabled ? null : (
        <aside className="panel">
        <h2>드라이버</h2>
        <div className="driver-list">
          {orderedDrivers.map((driver) => {
            const driverTick = ticksByDriver[driver.id];

            return (
              <button
                className={driver.id === selectedDriverId ? "driver-item active" : "driver-item"}
                key={driver.id}
                onClick={() => setSelectedDriverId(driver.id)}
                type="button"
              >
                <div className="driver-item-top">
                  <span>
                    #{driver.number} {driver.fullName}
                  </span>
                  <span className="muted">{driver.id === selectedDriverId ? "선택됨" : ""}</span>
                </div>
                <div className="driver-item-meta muted">{driver.teamName}</div>
                <div className="driver-item-stats">
                  <span className="driver-chip">{driverTick?.rank ? `R${driverTick.rank}` : "R-"}</span>
                  <span className="driver-chip">{driverTick ? `${driverTick.speedKph.toFixed(0)} kph` : "속도 -"}</span>
                </div>
              </button>
            );
          })}
        </div>

        <DriverPanel />
        <PredictionCard />
        </aside>
      )}
    </main>
  );
};
