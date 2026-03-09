"use client";

import { useMemo, useState } from "react";
import { useRaceStore } from "@/src/store/use-race-store";

export const DriverPanel = () => {
  const [linkError, setLinkError] = useState<string | null>(null);
  const drivers = useRaceStore((state) => state.drivers);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);

  const selected = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  if (!selected) {
    return <p className="muted">드라이버 선택 필요</p>;
  }

  const tick = ticksByDriver[selected.id];

  const openDeepLink = () => {
    setLinkError(null);
    const opened = window.open(selected.deepLink, "_blank", "noopener,noreferrer");
    if (!opened) {
      setLinkError("딥링크 실행 실패");
    }
  };

  return (
    <section style={{ marginTop: 14 }}>
      <h3>{selected.fullName}</h3>
      <p className="muted">{selected.teamName}</p>
      <p>랩: {tick?.lap ?? "-"}</p>
      <p>속도: {tick ? `${tick.speedKph.toFixed(1)} kph` : "-"}</p>
      <p>순위: {tick?.rank ?? "-"}</p>
      <button className="driver-item" onClick={openDeepLink} style={{ marginTop: 8 }} type="button">
        공식 온보드 열기
      </button>
      {linkError ? (
        <div>
          <p className="error-text">{linkError}</p>
          <a href={selected.deepLink} rel="noopener noreferrer" target="_blank">
            직접 열기
          </a>
        </div>
      ) : null}
    </section>
  );
};