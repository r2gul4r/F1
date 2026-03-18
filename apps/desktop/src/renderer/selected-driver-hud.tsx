import type { Driver, RaceFlag, TelemetryTick } from "@f1/core";
import { resolveFreshnessSummary } from "@f1/core";

const TELEMETRY_STALE_MS = 15_000;

const formatTime = (timestampMs: number | undefined): string =>
  typeof timestampMs === "number"
    ? new Date(timestampMs).toLocaleTimeString("ko-KR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "-";

const toFreshnessLabel = (freshness: ReturnType<typeof resolveFreshnessSummary>["freshness"]) => {
  if (freshness === "fresh") {
    return "정상";
  }

  if (freshness === "stale") {
    return "지연";
  }

  return "미수신";
};

type SelectedDriverHudProps = {
  flag: RaceFlag | null;
  focusModeEnabled: boolean;
  selectedDriver: Driver | null;
  selectedTick: TelemetryTick | undefined;
};

export const SelectedDriverHud = ({
  flag,
  focusModeEnabled,
  selectedDriver,
  selectedTick
}: SelectedDriverHudProps) => {
  if (!selectedDriver) {
    return null;
  }

  const freshnessSummary = resolveFreshnessSummary(selectedTick?.timestampMs, Date.now(), TELEMETRY_STALE_MS);
  const flagLabel = flag?.sector ? `${flag.flagType} · ${flag.sector}` : flag?.flagType ?? "GREEN";

  return (
    <section className="selected-driver-hud">
      <div className="hud-topline">
        <span className="muted-label">Selected Driver</span>
        <span className={`hud-status hud-status-${freshnessSummary.freshness.replace(/\s+/g, "-")}`}>
          {toFreshnessLabel(freshnessSummary.freshness)}
        </span>
      </div>
      <div className="hud-name">
        #{selectedDriver.number} {selectedDriver.fullName}
      </div>
      <div className="hud-team-row">
        <span>{selectedDriver.teamName}</span>
        <span>{focusModeEnabled ? "Focus camera" : "Overview camera"}</span>
      </div>
      <div className="hud-chip-row">
        <span className="hud-chip">Flag {flagLabel}</span>
        <span className="hud-chip">Update {formatTime(selectedTick?.timestampMs)}</span>
      </div>
      <div className="hud-stat-strip">
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
      </div>
    </section>
  );
};
