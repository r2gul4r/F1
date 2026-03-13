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

const formatElapsedSeconds = (nowMs: number, timestampMs: number): string => {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  return `${elapsedSeconds}초 전`;
};

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

    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [tick?.timestampMs]);

  const isStaleTelemetry = typeof tick?.timestampMs === "number" && nowMs - tick.timestampMs > TELEMETRY_STALE_MS;
  const flagType = flag?.flagType ?? "GREEN";
  const flagText = flag?.sector ? `${flagType} · ${flag.sector}` : flagType;
  const telemetryStatus = !tick
    ? { label: "미수신", className: "telemetry-status-chip-no-telemetry" }
    : isStaleTelemetry
      ? { label: "지연", className: "telemetry-status-chip-stale" }
      : { label: "정상", className: "telemetry-status-chip-fresh" };

  if (!selected) {
    return null;
  }

  return (
    <section className="selected-hud">
      <div className="selected-hud-name">
        #{selected.number} {selected.fullName}
      </div>
      <div className="selected-hud-team muted">{selected.teamName}</div>
      <div className="selected-hud-team muted">플래그 {flagText}</div>
      <span className={`telemetry-status-chip ${telemetryStatus.className} selected-hud-status`}>{telemetryStatus.label}</span>
      {isStaleTelemetry ? <div className="telemetry-stale-alert">지연 텔레메트리</div> : null}
      {tick ? (
        <div className="selected-hud-stats">
          <span>R{tick.rank}</span>
          <span>L{tick.lap}</span>
          <span>{tick.speedKph.toFixed(0)} kph</span>
        </div>
      ) : null}
      <a className="selected-hud-link" href={selected.deepLink} rel="noopener noreferrer" target="_blank">
        공식 온보드 열기
      </a>
      {tick ? (
        <div className="selected-hud-update muted">
          업데이트 {formatLastUpdate(tick.timestampMs)} ({formatElapsedSeconds(nowMs, tick.timestampMs)})
        </div>
      ) : (
        <div className="selected-hud-update muted">텔레메트리 수신 대기 중</div>
      )}
    </section>
  );
};
