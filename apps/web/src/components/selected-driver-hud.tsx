"use client";

import React, { useMemo } from "react";
import { useRaceStore } from "@/src/store/use-race-store";

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
      <div className="selected-hud-stats">
        <span>R{tick.rank}</span>
        <span>L{tick.lap}</span>
        <span>{tick.speedKph.toFixed(0)} kph</span>
      </div>
    </section>
  );
};
