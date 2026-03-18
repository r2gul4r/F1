"use client";

import React, { useEffect, useRef } from "react";
import { getCameraTarget, getDriverVisualState } from "@/src/components/race-canvas-visuals";
import { isTelemetryStale } from "@/src/components/telemetry-freshness";
import { useRaceStore } from "@/src/store/use-race-store";

const CAMERA_HALF_HEIGHT = 140;
const DRIVER_COLORS = ["#22d3ee", "#fb7185", "#facc15", "#4ade80", "#c084fc", "#f97316", "#60a5fa"];
const TRACK_COLOR = "#334155";
const TRACK_POINTS = Array.from({ length: 120 }).map((_, index) => {
  const theta = (index / 120) * Math.PI * 2;
  const radius = 120 + Math.sin(theta * 3) * 14;

  return {
    x: Math.cos(theta) * radius,
    y: Math.sin(theta) * radius
  };
});

type RaceCanvasProps = {
  focusModeEnabled?: boolean;
};

type DriverRenderState = {
  color: string;
  haloOpacity: number;
  haloScale: number;
  opacity: number;
  scale: number;
  x: number;
  y: number;
};

const getDriverColor = (driverId: string) => {
  const hash = Array.from(driverId).reduce((acc, character) => ((acc * 33) ^ character.charCodeAt(0)) >>> 0, 5381);
  return DRIVER_COLORS[hash % DRIVER_COLORS.length];
};

const lerp = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

const drawTrack = (context: CanvasRenderingContext2D) => {
  if (!TRACK_POINTS.length) {
    return;
  }

  context.save();
  context.beginPath();
  context.strokeStyle = TRACK_COLOR;
  context.lineJoin = "round";
  context.lineWidth = 4;
  context.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
  TRACK_POINTS.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.stroke();
  context.restore();
};

const drawDriverHalo = (context: CanvasRenderingContext2D, state: DriverRenderState) => {
  if (state.haloOpacity <= 0) {
    return;
  }

  context.save();
  context.beginPath();
  context.globalAlpha = state.haloOpacity;
  context.lineWidth = 1.9 * state.haloScale;
  context.strokeStyle = state.color;
  context.arc(state.x, state.y, 7.15 * state.haloScale, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

const drawDriverMarker = (context: CanvasRenderingContext2D, state: DriverRenderState) => {
  context.save();
  context.beginPath();
  context.fillStyle = state.color;
  context.globalAlpha = state.opacity;
  context.arc(state.x, state.y, 4.6 * state.scale, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

export const RaceCanvas = ({ focusModeEnabled = false }: RaceCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const driversRef = useRef(useRaceStore.getState().drivers);
  const ticksRef = useRef(useRaceStore.getState().ticksByDriver);
  const selectedDriverIdRef = useRef(useRaceStore.getState().selectedDriverId);
  const focusModeEnabledRef = useRef(focusModeEnabled);
  const drivers = useRaceStore((state) => state.drivers);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const setFps = useRaceStore((state) => state.setFps);

  useEffect(() => {
    driversRef.current = drivers;
  }, [drivers]);

  useEffect(() => {
    ticksRef.current = ticksByDriver;
  }, [ticksByDriver]);

  useEffect(() => {
    selectedDriverIdRef.current = selectedDriverId;
  }, [selectedDriverId]);

  useEffect(() => {
    focusModeEnabledRef.current = focusModeEnabled;
  }, [focusModeEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const driverStates = new Map<string, DriverRenderState>();
    const cameraFocus = { x: 0, y: 0 };
    let frameCount = 0;
    let lastFrameAt = performance.now();
    let rafId = 0;
    let viewportHeight = 0;
    let viewportWidth = 0;
    let pixelRatio = 1;

    const syncViewport = () => {
      viewportWidth = Math.max(container.clientWidth, 1);
      viewportHeight = Math.max(container.clientHeight, 1);
      pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(Math.round(viewportWidth * pixelRatio), 1);
      canvas.height = Math.max(Math.round(viewportHeight * pixelRatio), 1);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
    };

    const animate = () => {
      frameCount += 1;
      const now = performance.now();
      const delta = now - lastFrameAt;

      if (delta >= 1000) {
        setFps((frameCount / delta) * 1000);
        frameCount = 0;
        lastFrameAt = now;
      }

      const activeDriverIds = new Set(driversRef.current.map((driver) => driver.id));
      const selectedDriverTick = selectedDriverIdRef.current ? ticksRef.current[selectedDriverIdRef.current] ?? null : null;
      const selectedDriverIsFresh = selectedDriverTick
        ? !isTelemetryStale(selectedDriverTick.timestampMs, Date.now())
        : false;
      const activeSelectedDriverId =
        selectedDriverIdRef.current &&
        activeDriverIds.has(selectedDriverIdRef.current) &&
        selectedDriverTick &&
        selectedDriverIsFresh
          ? selectedDriverIdRef.current
          : null;
      const activeSelectedDriverTick = activeSelectedDriverId ? selectedDriverTick : null;
      const ticks = Object.values(ticksRef.current).filter((tick) => activeDriverIds.has(tick.driverId));

      ticks.forEach((tick) => {
        const visualState = getDriverVisualState({
          driverId: tick.driverId,
          elapsedMs: now,
          selectedDriverId: activeSelectedDriverId
        });
        const existing = driverStates.get(tick.driverId);
        const color = getDriverColor(tick.driverId);

        if (existing) {
          existing.x = lerp(existing.x, tick.position.x, 0.22);
          existing.y = lerp(existing.y, tick.position.y, 0.22);
          existing.scale = lerp(existing.scale, visualState.scale, 0.24);
          existing.haloScale = lerp(existing.haloScale, visualState.haloScale, 0.2);
          existing.opacity = visualState.opacity;
          existing.haloOpacity = visualState.haloOpacity;
          existing.color = color;
          return;
        }

        driverStates.set(tick.driverId, {
          color,
          haloOpacity: visualState.haloOpacity,
          haloScale: visualState.haloScale,
          opacity: visualState.opacity,
          scale: visualState.scale,
          x: tick.position.x,
          y: tick.position.y
        });
      });

      Array.from(driverStates.keys()).forEach((driverId) => {
        const hasRenderableTick = activeDriverIds.has(driverId) && Boolean(ticksRef.current[driverId]);
        if (hasRenderableTick) {
          return;
        }

        driverStates.delete(driverId);
      });

      const cameraTarget = getCameraTarget({
        focusModeEnabled: focusModeEnabledRef.current,
        selectedDriverId: activeSelectedDriverId,
        selectedDriverTick: activeSelectedDriverTick
      });
      cameraFocus.x = lerp(cameraFocus.x, cameraTarget.x, 0.12);
      cameraFocus.y = lerp(cameraFocus.y, cameraTarget.y, 0.12);

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.translate(viewportWidth / 2, viewportHeight / 2);
      const worldScale = viewportHeight / (CAMERA_HALF_HEIGHT * 2);
      context.scale(worldScale, -worldScale);
      context.translate(-cameraFocus.x, -cameraFocus.y);

      drawTrack(context);

      const renderStates = Array.from(driverStates.entries()).sort(([leftDriverId], [rightDriverId]) => {
        if (leftDriverId === activeSelectedDriverId) {
          return 1;
        }

        if (rightDriverId === activeSelectedDriverId) {
          return -1;
        }

        return 0;
      });

      renderStates.forEach(([, state]) => {
        drawDriverHalo(context, state);
      });

      renderStates.forEach(([, state]) => {
        drawDriverMarker(context, state);
      });

      rafId = requestAnimationFrame(animate);
    };

    let resizeObserver: ResizeObserver | null = null;
    const handleResize = () => {
      syncViewport();
    };

    syncViewport();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        syncViewport();
      });
      resizeObserver.observe(container);
    }
    window.addEventListener("resize", handleResize);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      driverStates.clear();
    };
  }, [setFps]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 520 }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
};
