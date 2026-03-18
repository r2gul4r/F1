"use client";

import type { CameraState, CarState, SessionSnapshot } from "@f1/core";
import React, { useEffect, useMemo, useRef } from "react";
import { buildRaceBoardFrame, DESKTOP_TRACK_MODEL } from "./race-board-visuals";

const TRACK_WIDTH = 34;
const TELEMETRY_STALE_MS = 15_000;
const CAR_COLORS = ["#7dd3fc", "#f472b6", "#facc15", "#4ade80", "#fb7185", "#a78bfa"];

const projectPoint = (
  x: number,
  y: number,
  z: number
): { x: number; y: number } => ({
  x,
  y: y * 0.44 - z * 0.9
});

const getDriverColor = (driverId: string): string => {
  const hash = Array.from(driverId).reduce((acc, character) => ((acc * 33) ^ character.charCodeAt(0)) >>> 0, 5381);
  return CAR_COLORS[hash % CAR_COLORS.length] ?? CAR_COLORS[0];
};

const drawTrackRibbon = (context: CanvasRenderingContext2D, points: typeof DESKTOP_TRACK_MODEL.points, width: number) => {
  if (points.length === 0) {
    return;
  }

  const outer = points.map((point, index, source) => {
    const next = source[(index + 1) % source.length] ?? source[0] ?? point;
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: point.x - (dy / length) * width,
      y: point.y + (dx / length) * width
    };
  });

  const inner = points.map((point, index, source) => {
    const next = source[(index + 1) % source.length] ?? source[0] ?? point;
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: point.x + (dy / length) * width,
      y: point.y - (dx / length) * width
    };
  });

  context.beginPath();
  outer.forEach((point, index) => {
    const projected = projectPoint(point.x, point.y, 0);
    if (index === 0) {
      context.moveTo(projected.x, projected.y);
      return;
    }
    context.lineTo(projected.x, projected.y);
  });
  [...inner].reverse().forEach((point) => {
    const projected = projectPoint(point.x, point.y, 0);
    context.lineTo(projected.x, projected.y);
  });
  context.closePath();
};

const drawBackdrop = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#081321");
  gradient.addColorStop(1, "#030813");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.08;
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 1;
  for (let index = -8; index <= 8; index += 1) {
    context.beginPath();
    context.moveTo(0, height / 2 + index * 24);
    context.lineTo(width, height / 2 + index * 24);
    context.stroke();
  }
  context.restore();
};

const drawCars = (context: CanvasRenderingContext2D, cars: CarState[]) => {
  cars.forEach((car) => {
    if (!car.smoothedPosition) {
      return;
    }

    const color = getDriverColor(car.driverId);
    const projected = projectPoint(car.smoothedPosition.x, car.smoothedPosition.y, car.smoothedPosition.z);
    const scale = 0.95 + car.visual.scale * 0.35;

    if (car.visual.haloOpacity > 0) {
      context.save();
      context.globalAlpha = car.visual.haloOpacity;
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      context.beginPath();
      context.ellipse(projected.x, projected.y, 14 * car.visual.haloScale, 7.5 * car.visual.haloScale, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    context.save();
    context.translate(projected.x, projected.y);
    context.scale(scale, scale);
    context.globalAlpha = car.visual.opacity;
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(-10, -4.5, 20, 9, 4);
    context.fill();
    context.fillStyle = "#f8fafc";
    context.fillRect(-3, -1.2, 6, 2.4);
    context.restore();
  });
};

type RaceBoardProps = {
  focusModeEnabled: boolean;
  onFpsChange: (fps: number) => void;
  selectedDriverId: string | null;
  snapshot: SessionSnapshot;
};

export const RaceBoard = ({ focusModeEnabled, onFpsChange, selectedDriverId, snapshot }: RaceBoardProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousCarsRef = useRef<Record<string, CarState>>({});
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, focusModeEnabled });
  const snapshotRef = useRef(snapshot);
  const selectedDriverIdRef = useRef(selectedDriverId);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    selectedDriverIdRef.current = selectedDriverId;
  }, [selectedDriverId]);

  useEffect(() => {
    cameraRef.current = {
      ...cameraRef.current,
      focusModeEnabled
    };
  }, [focusModeEnabled]);

  const driverCount = useMemo(() => snapshot.drivers.length, [snapshot.drivers.length]);

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

    let rafId = 0;
    let frameCount = 0;
    let fpsStartedAt = performance.now();
    let viewportWidth = 0;
    let viewportHeight = 0;
    let pixelRatio = 1;

    const syncViewport = () => {
      viewportWidth = Math.max(container.clientWidth, 1);
      viewportHeight = Math.max(container.clientHeight, 1);
      pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(viewportWidth * pixelRatio);
      canvas.height = Math.round(viewportHeight * pixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
    };

    const render = () => {
      const now = performance.now();
      frameCount += 1;

      if (now - fpsStartedAt >= 1000) {
        onFpsChange((frameCount / (now - fpsStartedAt)) * 1000);
        frameCount = 0;
        fpsStartedAt = now;
      }

      const frame = buildRaceBoardFrame({
        nowMs: Date.now(),
        telemetryStaleMs: TELEMETRY_STALE_MS,
        selectedDriverId: selectedDriverIdRef.current,
        snapshot: snapshotRef.current,
        previousCarsByDriver: previousCarsRef.current,
        camera: cameraRef.current,
        track: DESKTOP_TRACK_MODEL
      });

      previousCarsRef.current = frame.carsByDriver;
      cameraRef.current = frame.camera;

      context.setTransform(1, 0, 0, 1, 0, 0);
      drawBackdrop(context, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.translate(viewportWidth / 2, viewportHeight / 2 + 36);
      const zoom = viewportHeight / (DESKTOP_TRACK_MODEL.halfHeight * 2.35);
      context.scale(zoom, zoom);
      context.translate(-frame.camera.x, -frame.camera.y * 0.44);

      context.save();
      drawTrackRibbon(context, DESKTOP_TRACK_MODEL.points, TRACK_WIDTH);
      const trackGradient = context.createLinearGradient(-200, -120, 220, 120);
      trackGradient.addColorStop(0, "#10263d");
      trackGradient.addColorStop(1, "#1f3c5d");
      context.fillStyle = trackGradient;
      context.fill();
      context.strokeStyle = "rgba(148, 163, 184, 0.45)";
      context.lineWidth = 2;
      context.stroke();
      context.restore();

      context.save();
      context.globalAlpha = 0.34;
      context.strokeStyle = "#f8fafc";
      context.setLineDash([10, 12]);
      context.beginPath();
      DESKTOP_TRACK_MODEL.points.forEach((point, index) => {
        const projected = projectPoint(point.x, point.y, 0);
        if (index === 0) {
          context.moveTo(projected.x, projected.y);
          return;
        }
        context.lineTo(projected.x, projected.y);
      });
      context.closePath();
      context.stroke();
      context.setLineDash([]);
      context.restore();

      drawCars(context, frame.cars);
      rafId = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(() => {
      syncViewport();
    });

    syncViewport();
    resizeObserver.observe(container);
    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [driverCount, onFpsChange]);

  return (
    <div className="race-board-shell" ref={containerRef}>
      <canvas className="race-board-canvas" ref={canvasRef} />
    </div>
  );
};
