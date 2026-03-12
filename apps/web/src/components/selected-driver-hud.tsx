"use client";

import React, { useMemo } from "react";
import { useRaceStore } from "@/src/store/use-race-store";

const formatLastUpdate = (timestampMs: number): string =>
  new Date(timestampMs).toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

export const SelectedDriverHud = () => {
  const drivers = useRaceStore((state) => state.drivers);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);

  const selected = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  if (!selected) {
    return null;
  }

  const tick = ticksByDriver[selected.id];
  if (!tick) {
    return null;
  }

  return (
    <section className="selected-hud">
      <div className="selected-hud-name">
        #{selected.number} {selected.fullName}
      </div>
      <div className="selected-hud-team muted">{selected.teamName}</div>
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
