import React from "react";
import type { DriverRailItem } from "./driver-rail";

type DriverRailListProps = {
  items: DriverRailItem[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
};

export const DriverRailList = ({ items, onSelectDriver, selectedDriverId }: DriverRailListProps) => (
  <div className="driver-pill-list">
    {items.map(({ driver, tick, isLeader, freshness, freshnessLabel }) => {
      const isSelected = driver.id === selectedDriverId;
      return (
        <button
          className={isSelected ? "driver-pill active" : "driver-pill"}
          key={driver.id}
          onClick={() => onSelectDriver(driver.id)}
          type="button"
        >
          <span>{driver.number}</span>
          <span>{driver.id}</span>
          <span className={`driver-pill-freshness driver-pill-freshness-${freshness.replace(/\s+/g, "-")}`}>
            {freshnessLabel}
          </span>
          <span className="driver-pill-rank">{tick ? `P${tick.rank}` : "P-"}</span>
          {isLeader ? <span className="driver-pill-leader">Leader</span> : null}
        </button>
      );
    })}
  </div>
);
