"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRaceStore } from "@/src/store/use-race-store";

const TELEMETRY_STALE_MS = 15000;

const formatLastUpdate = (timestampMs: number): string =>
  new Date(timestampMs).toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

export const SelectedDriverHud = () => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const drivers = useRaceStore((state) => state.drivers);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);
  const flag = useRaceStore((state) => state.flag);

  const selected = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );
  const tick = selected ? ticksByDriver[selected.id] : undefined;

  useEffect(() => {
    if (typeof tick?.timestampMs !== "number") {
      return;
    }

    const current = Date.now();
    setNowMs(current);
    const ageMs = current - tick.timestampMs;
    if (ageMs >= TELEMETRY_STALE_MS) {
      return;
    }

    const timeoutMs = TELEMETRY_STALE_MS - ageMs + 1;
    const timer = window.setTimeout(() => {
      setNowMs(Date.now());
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [tick?.timestampMs]);

  const isStaleTelemetry = typeof tick?.timestampMs === "number" && nowMs - tick.timestampMs > TELEMETRY_STALE_MS;
  const flagText = flag?.flagType ?? "GREEN";

  if (!selected) {
    return null;
  }

  if (!tick) {
    return (
      <section className="selected-hud">
        <div className="selected-hud-name">
          #{selected.number} {selected.fullName}
        </div>
        <div className="selected-hud-team muted">{selected.teamName}</div>
        <div className="selected-hud-team muted">플래그 {flagText}</div>
        <a className="selected-hud-link" href={selected.deepLink} rel="noopener noreferrer" target="_blank">
          공식 온보드 열기
        </a>
        <div className="selected-hud-update muted">텔레메트리 수신 대기 중</div>
      </section>
    );
  }

  return (
    <section className="selected-hud">
      <div className="selected-hud-name">
        #{selected.number} {selected.fullName}
      </div>
      <div className="selected-hud-team muted">{selected.teamName}</div>
      <div className="selected-hud-team muted">플래그 {flagText}</div>
      {isStaleTelemetry ? <div className="telemetry-stale-alert">지연 텔레메트리</div> : null}
      <div className="selected-hud-stats">
        <span>R{tick.rank}</span>
        <span>L{tick.lap}</span>
        <span>{tick.speedKph.toFixed(0)} kph</span>
      </div>
      <a className="selected-hud-link" href={selected.deepLink} rel="noopener noreferrer" target="_blank">
        공식 온보드 열기
      </a>
      <div className="selected-hud-update muted">업데이트 {formatLastUpdate(tick.timestampMs)}</div>
    </section>
  );
};
