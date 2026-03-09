"use client";

import { useEffect } from "react";
import { DriverPanel } from "@/src/components/driver-panel";
import { PredictionCard } from "@/src/components/prediction-card";
import { RaceCanvas } from "@/src/components/race-canvas";
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
  const drivers = useRaceStore((state) => state.drivers);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const setSelectedDriverId = useRaceStore((state) => state.setSelectedDriverId);
  const flag = useRaceStore((state) => state.flag);
  const fps = useRaceStore((state) => state.fps);

  useEffect(() => {
    if (!selectedDriverId && drivers[0]) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [drivers, selectedDriverId, setSelectedDriverId]);

  return (
    <main className="dashboard">
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
        </div>
        {status !== "connected" ? <p className="muted">재연결 예정: {Math.ceil(reconnectInMs / 1000)}초</p> : null}
        <RaceCanvas />
      </section>

      <aside className="panel">
        <h2>드라이버</h2>
        <div className="driver-list">
          {drivers.map((driver) => (
            <button
              className={driver.id === selectedDriverId ? "driver-item active" : "driver-item"}
              key={driver.id}
              onClick={() => setSelectedDriverId(driver.id)}
              type="button"
            >
              #{driver.number} {driver.fullName}
            </button>
          ))}
        </div>

        <DriverPanel />
        <PredictionCard />
      </aside>
    </main>
  );
};
