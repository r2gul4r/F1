import React, { useDeferredValue, useMemo, useState } from "react";
import { RaceBoard } from "./race-board";
import { useMockSession } from "./mock-session";

export const App = () => {
  const [fps, setFps] = useState(0);
  const {
    snapshot,
    selectedDriver,
    selectedDriverId,
    setSelectedDriverId,
    focusModeEnabled,
    setFocusModeEnabled
  } = useMockSession();
  const deferredSnapshot = useDeferredValue(snapshot);
  const selectedTick = useMemo(
    () => (selectedDriver ? deferredSnapshot.latestTicksByDriver[selectedDriver.id] : undefined),
    [deferredSnapshot.latestTicksByDriver, selectedDriver]
  );

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">F1 Pulse Desktop</div>
        <h1>2.5D race board MVP</h1>
        <p className="lead">
          계약을 잠근 뒤 첫 번째 renderer MVP를 올렸다. 지금은 mock 세션으로 서킷과 차량 보간 레이어를 검증하고,
          다음 슬라이스에서 HUD 와 정보 패널을 본격적으로 붙인다.
        </p>
      </section>

      <section className="desktop-board">
        <article className="board-panel board-stage">
          <div className="stage-toolbar">
            <div>
              <div className="muted-label">Renderer</div>
              <strong>{focusModeEnabled ? "Focus camera on" : "Orbit overview"}</strong>
            </div>
            <button className="mode-toggle" onClick={() => setFocusModeEnabled((value) => !value)} type="button">
              {focusModeEnabled ? "집중 모드 끄기" : "집중 모드 켜기"}
            </button>
          </div>
          <RaceBoard
            focusModeEnabled={focusModeEnabled}
            onFpsChange={setFps}
            selectedDriverId={selectedDriverId}
            snapshot={deferredSnapshot}
          />
        </article>

        <aside className="board-panel board-sidebar">
          <section className="info-card">
            <div className="muted-label">Selected Driver</div>
            <h2>{selectedDriver ? `${selectedDriver.number} ${selectedDriver.fullName}` : "선택 없음"}</h2>
            <p className="team-name">{selectedDriver?.teamName ?? "Driver unavailable"}</p>
            <div className="stat-grid">
              <article>
                <span className="muted-label">Rank</span>
                <strong>{selectedTick?.rank ?? "-"}</strong>
              </article>
              <article>
                <span className="muted-label">Lap</span>
                <strong>{selectedTick?.lap ?? "-"}</strong>
              </article>
              <article>
                <span className="muted-label">Speed</span>
                <strong>{selectedTick ? `${selectedTick.speedKph.toFixed(0)} kph` : "-"}</strong>
              </article>
              <article>
                <span className="muted-label">FPS</span>
                <strong>{fps.toFixed(1)}</strong>
              </article>
            </div>
          </section>

          <section className="info-card">
            <div className="muted-label">Mock Grid</div>
            <div className="driver-pill-list">
              {deferredSnapshot.drivers.map((driver) => {
                const tick = deferredSnapshot.latestTicksByDriver[driver.id];
                const isSelected = driver.id === selectedDriverId;
                return (
                  <button
                    className={isSelected ? "driver-pill active" : "driver-pill"}
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    type="button"
                  >
                    <span>{driver.number}</span>
                    <span>{driver.id}</span>
                    <span className="driver-pill-rank">{tick ? `P${tick.rank}` : "P-"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="info-card runtime-card">
            <div className="muted-label">Runtime</div>
            <dl className="meta">
              <div>
                <dt>Platform</dt>
                <dd>{window.desktopShell.platform}</dd>
              </div>
              <div>
                <dt>Electron</dt>
                <dd>{window.desktopShell.versions.electron}</dd>
              </div>
              <div>
                <dt>Chrome</dt>
                <dd>{window.desktopShell.versions.chrome}</dd>
              </div>
              <div>
                <dt>Node</dt>
                <dd>{window.desktopShell.versions.node}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
};
