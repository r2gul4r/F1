"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRaceStore } from "@/src/store/use-race-store";

const TELEMETRY_STALE_MS = 15000;

const formatTelemetryTime = (timestampMs: number | undefined): string =>
  typeof timestampMs === "number"
    ? new Date(timestampMs).toLocaleTimeString("ko-KR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "-";

export const DriverPanel = () => {
  const [linkError, setLinkError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const drivers = useRaceStore((state) => state.drivers);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);

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
    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [tick?.timestampMs]);

  const isStaleTelemetry = typeof tick?.timestampMs === "number" && nowMs - tick.timestampMs > TELEMETRY_STALE_MS;

  if (!selected) {
    return <p className="muted">드라이버 선택 필요</p>;
  }

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

      {tick ? (
        <>
          {isStaleTelemetry ? <div className="telemetry-stale-alert">지연 텔레메트리</div> : null}
          <div className="telemetry-grid">
            <article className="telemetry-card">
              <div className="muted">순위</div>
              <div className="telemetry-value">{tick.rank}</div>
            </article>
            <article className="telemetry-card">
              <div className="muted">랩</div>
              <div className="telemetry-value">{tick.lap}</div>
            </article>
            <article className="telemetry-card">
              <div className="muted">속도</div>
              <div className="telemetry-value">{tick.speedKph.toFixed(1)} kph</div>
            </article>
            <article className="telemetry-card">
              <div className="muted">마지막 수신</div>
              <div className="telemetry-value">{formatTelemetryTime(tick.timestampMs)}</div>
            </article>
          </div>
        </>
      ) : (
        <div className="telemetry-empty muted">텔레메트리 대기 중</div>
      )}

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
