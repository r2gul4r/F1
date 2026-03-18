import { resolveFreshnessSummary, resolvePredictionContext, toPredictionViewModel } from "@f1/core";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDesktopSession } from "./desktop-session";
import { buildDriverRailItems } from "./driver-rail";
import { getNextSelectedDriverId, isFocusToggleKey } from "./keyboard-controls";
import { buildPredictionHistory } from "./prediction-history";
import { toAiProviderLabel, toPredictionContextLabel } from "./prediction-status";
import { buildPodiumStripItems } from "./podium-strip";
import { buildSelectedDriverDetails } from "./selected-driver-details";
import { getSupportedLocalSessionSources } from "./session-source-controls";
import {
  DESKTOP_SESSION_SOURCE_STORAGE_KEY,
  resolveInitialSessionSourceOverride,
  shouldPersistSessionSourceOverride
} from "./session-source-preference";
import { RaceBoard } from "./race-board";
import { SelectedDriverHud } from "./selected-driver-hud";

const TELEMETRY_STALE_MS = 15_000;
const FRESHNESS_LABEL = {
  fresh: "정상",
  stale: "지연",
  "no telemetry": "미수신"
} as const;

export const App = () => {
  const [fps, setFps] = useState(0);
  const [sessionSourceOverride, setSessionSourceOverride] = useState<typeof window.desktopShell.sessionSource | null>(() =>
    resolveInitialSessionSourceOverride(() => window.localStorage.getItem(DESKTOP_SESSION_SOURCE_STORAGE_KEY))
  );
  const runtime = window.desktopShell;
  const effectiveRuntime = sessionSourceOverride
    ? { ...runtime, sessionSource: sessionSourceOverride }
    : runtime;
  const sessionSourceOptions = getSupportedLocalSessionSources(runtime.sessionSource);
  const session = useDesktopSession(effectiveRuntime);

  if (session.kind === "unavailable") {
    return (
      <main className="shell">
        <section className="hero">
          <div className="eyebrow">F1 Pulse Desktop</div>
          <h1>Desktop session source unavailable</h1>
          <p className="lead">
            Runtime contract is pinned, but `{effectiveRuntime.sessionSource}` is not wired to a local session adapter yet.
            Public web relay remains `{runtime.publicWebRelay ? "enabled" : "disabled"}`.
          </p>
        </section>
        <section className="desktop-board">
          <article className="board-panel board-stage">
            <div className="stage-toolbar">
              <div>
                <div className="muted-label">Desktop Shell Boundary</div>
                <strong>{runtime.mode} · {effectiveRuntime.sessionSource}</strong>
              </div>
            </div>
            <div className="stage-view" style={{ display: "grid", placeItems: "center", minHeight: 520 }}>
              <div className="info-card" style={{ maxWidth: 420 }}>
                <div className="muted-label">Unavailable</div>
                <h2>{session.message}</h2>
                <p className="team-name">Switch `DESKTOP_SESSION_SOURCE=mock-session` or `replay-buffer`, or wire the next session adapter slice.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <button className="mode-toggle" onClick={() => setSessionSourceOverride(null)} type="button">
                    Runtime default
                  </button>
                  {sessionSourceOptions.map((option) => (
                    <button
                      className="mode-toggle"
                      key={option.key}
                      onClick={() => setSessionSourceOverride(option.key)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>
      </main>
    );
  }

  const {
    snapshot,
    selectedDriver,
    selectedDriverId,
    setSelectedDriverId,
    focusModeEnabled,
    setFocusModeEnabled
  } = session;
  const deferredSnapshot = useDeferredValue(snapshot);
  const driverRailItems = useMemo(() => buildDriverRailItems(deferredSnapshot), [deferredSnapshot]);
  const podiumStripItems = useMemo(() => buildPodiumStripItems(driverRailItems), [driverRailItems]);
  const orderedDriverIds = useMemo(() => driverRailItems.map((item) => item.driver.id), [driverRailItems]);
  const selectedTick = useMemo(
    () => (selectedDriver ? deferredSnapshot.latestTicksByDriver[selectedDriver.id] : undefined),
    [deferredSnapshot.latestTicksByDriver, selectedDriver]
  );
  const telemetryFreshness = resolveFreshnessSummary(selectedTick?.timestampMs, Date.now(), TELEMETRY_STALE_MS);
  const telemetryFreshnessLabel = FRESHNESS_LABEL[telemetryFreshness.freshness];
  const flagLabel = deferredSnapshot.flag?.sector
    ? `${deferredSnapshot.flag.flagType} · ${deferredSnapshot.flag.sector}`
    : deferredSnapshot.flag?.flagType ?? "GREEN";
  const predictionViewModel = useMemo(
    () => toPredictionViewModel(resolvePredictionContext(deferredSnapshot.predictions, selectedDriverId), Date.now()),
    [deferredSnapshot.predictions, selectedDriverId]
  );
  const predictionHistory = useMemo(() => buildPredictionHistory(deferredSnapshot.predictions), [deferredSnapshot.predictions]);
  const selectedDriverDetails = useMemo(
    () => buildSelectedDriverDetails(selectedDriver, selectedTick),
    [selectedDriver, selectedTick]
  );
  const aiProviderLabel = toAiProviderLabel(runtime.aiProvider);
  const predictionContextLabel = toPredictionContextLabel({
    selectedDriverPriority: predictionViewModel.context.selectedDriverPriority,
    selectedPredictionStale: predictionViewModel.context.selectedPredictionStale
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedDriverId(getNextSelectedDriverId(orderedDriverIds, selectedDriverId, "previous"));
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedDriverId(getNextSelectedDriverId(orderedDriverIds, selectedDriverId, "next"));
        return;
      }

      if (isFocusToggleKey(event.key)) {
        event.preventDefault();
        setFocusModeEnabled((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [orderedDriverIds, selectedDriverId, setFocusModeEnabled, setSelectedDriverId]);

  useEffect(() => {
    if (!shouldPersistSessionSourceOverride(sessionSourceOverride)) {
      window.localStorage.removeItem(DESKTOP_SESSION_SOURCE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(DESKTOP_SESSION_SOURCE_STORAGE_KEY, sessionSourceOverride);
  }, [sessionSourceOverride]);

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">F1 Pulse Desktop</div>
        <h1>2.5D race board MVP</h1>
        <p className="lead">
          로컬 앱 경계는 preload runtime contract를 기준으로 고정되어 있다. 현재 `{runtime.mode}` 모드에서
          `{effectiveRuntime.sessionSource}` 소스로 서킷과 차량 보간 레이어를 검증 중이며, public web relay는
          `{runtime.publicWebRelay ? "enabled" : "disabled"}` 상태다.
        </p>
      </section>

      <section className="desktop-board">
        <article className="board-panel board-stage">
          <div className="stage-toolbar">
            <div>
              <div className="muted-label">Desktop Race Board</div>
              <strong>
                {focusModeEnabled ? "Focus camera on selected driver" : "Overview orbit with live HUD"} · {runtime.mode}
              </strong>
              <div className="muted-label" style={{ marginTop: 6 }}>
                Controls: `F` focus toggle, `ArrowUp/ArrowDown` driver cycle
              </div>
            </div>
            <button className="mode-toggle" onClick={() => setFocusModeEnabled((value) => !value)} type="button">
              {focusModeEnabled ? "집중 모드 끄기" : "집중 모드 켜기"}
            </button>
          </div>
          <div className="stage-view">
            <div className="hud-chip-row" style={{ marginBottom: 12 }}>
              {podiumStripItems.map((item) => (
                <span className="hud-chip" key={item.driverId}>
                  P{item.rank} {item.driverId} {item.speedKph ? `· ${item.speedKph.toFixed(0)} kph` : ""}
                </span>
              ))}
            </div>
            <RaceBoard
              focusModeEnabled={focusModeEnabled}
              onFpsChange={setFps}
              selectedDriverId={selectedDriverId}
              snapshot={deferredSnapshot}
            />
            <SelectedDriverHud
              flag={deferredSnapshot.flag}
              focusModeEnabled={focusModeEnabled}
              selectedDriver={selectedDriver}
              selectedTick={selectedTick}
            />
            <div className="stage-bottom-bar">
              <span className="hud-chip">Telemetry {telemetryFreshnessLabel}</span>
              <span className="hud-chip">Race Control {flagLabel}</span>
              <span className="hud-chip">Renderer {fps.toFixed(1)} FPS</span>
            </div>
          </div>
        </article>

        <aside className="board-panel board-sidebar">
          <section className="info-card">
            <div className="muted-label">Telemetry Focus</div>
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
              <article>
                <span className="muted-label">Telemetry</span>
                <strong>{telemetryFreshnessLabel}</strong>
              </article>
              <article>
                <span className="muted-label">Flag</span>
                <strong>{flagLabel}</strong>
              </article>
              {selectedDriverDetails.map((detail) => (
                <article key={detail.label}>
                  <span className="muted-label">{detail.label}</span>
                  <strong>{detail.value}</strong>
                </article>
              ))}
            </div>
            <div className="info-note">
              이 레일은 gap, interval, gear, RPM, tire까지 포함한 selected-driver detail view를 즉시 읽도록 정리돼 있다.
            </div>
          </section>

          <section className="info-card">
            <div className="muted-label">Driver Rail</div>
            <div className="driver-pill-list">
              {driverRailItems.map(({ driver, tick, isLeader }) => {
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
                    {isLeader ? <span className="driver-pill-leader">Leader</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="info-card">
            <div className="muted-label">Race Control</div>
            <div className="stat-grid">
              <article>
                <span className="muted-label">Flag</span>
                <strong>{flagLabel}</strong>
              </article>
              <article>
                <span className="muted-label">Camera</span>
                <strong>{focusModeEnabled ? "Selected focus" : "Circuit overview"}</strong>
              </article>
              <article>
                <span className="muted-label">Update Mode</span>
                <strong>{effectiveRuntime.sessionSource}</strong>
              </article>
              <article>
                <span className="muted-label">Prediction</span>
                <strong>{aiProviderLabel}</strong>
              </article>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button className="mode-toggle" onClick={() => setSessionSourceOverride(null)} type="button">
                Runtime default
              </button>
              {sessionSourceOptions.map((option) => (
                <button
                  className="mode-toggle"
                  key={option.key}
                  onClick={() => setSessionSourceOverride(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="info-card">
            <div className="muted-label">Lap AI Context</div>
            {predictionViewModel.context.visiblePrediction ? (
              <>
                <div className="hud-chip-row" style={{ marginTop: 12 }}>
                  <span className="hud-chip">Provider {aiProviderLabel}</span>
                  <span className="hud-chip">Context {predictionContextLabel}</span>
                  <span className="hud-chip">
                    {predictionViewModel.context.visiblePrediction.isFallback ? "Fallback" : "Primary"}
                  </span>
                  {predictionViewModel.context.visiblePrediction.fallbackReason ? (
                    <span className="hud-chip">Reason {predictionViewModel.context.visiblePrediction.fallbackReason}</span>
                  ) : null}
                </div>
                <div className="stat-grid">
                  <article>
                    <span className="muted-label">Lap</span>
                    <strong>{predictionViewModel.context.visiblePrediction.lap}</strong>
                  </article>
                  <article>
                    <span className="muted-label">Trigger</span>
                    <strong>{predictionViewModel.context.visiblePrediction.triggerDriverId}</strong>
                  </article>
                  <article>
                    <span className="muted-label">P1</span>
                    <strong>{Math.round(predictionViewModel.context.visiblePrediction.podiumProb[0] * 100)}%</strong>
                  </article>
                  <article>
                    <span className="muted-label">Age</span>
                    <strong>
                      {predictionViewModel.elapsedSeconds === null ? "-" : `${predictionViewModel.elapsedSeconds}s`}
                    </strong>
                  </article>
                </div>
                <div className="info-note">{predictionViewModel.context.visiblePrediction.reasoningSummary}</div>
              </>
            ) : (
              <div className="info-note">Lap-boundary prediction is waiting for the next deterministic update.</div>
            )}
            {predictionViewModel.context.selectedPredictionStale ? (
              <div className="info-note">
                Selected driver prediction is {predictionViewModel.context.staleGapSeconds}s behind the latest overall update.
              </div>
            ) : null}
            {predictionHistory.length > 0 ? (
              <div className="hud-chip-row" style={{ marginTop: 12 }}>
                {predictionHistory.map((item) => (
                  <span className="hud-chip" key={`${item.lap}-${item.triggerDriverId}`}>
                    Lap {item.lap} · {item.triggerDriverId} · {item.isFallback ? `fallback${item.fallbackReason ? `:${item.fallbackReason}` : ""}` : "primary"}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="info-card runtime-card">
            <div className="muted-label">Runtime</div>
            <dl className="meta">
              <div>
                <dt>Platform</dt>
                <dd>{runtime.platform}</dd>
              </div>
              <div>
                <dt>Electron</dt>
                <dd>{runtime.versions.electron}</dd>
              </div>
              <div>
                <dt>Chrome</dt>
                <dd>{runtime.versions.chrome}</dd>
              </div>
              <div>
                <dt>Node</dt>
                <dd>{runtime.versions.node}</dd>
              </div>
              <div>
                <dt>Data Source</dt>
                <dd>{runtime.dataSource}</dd>
              </div>
              <div>
                <dt>Public Relay</dt>
                <dd>{runtime.publicWebRelay ? "enabled" : "disabled"}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
};
