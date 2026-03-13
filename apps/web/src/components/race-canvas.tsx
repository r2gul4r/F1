"use client";

import React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getCameraTarget, getDriverVisualState } from "@/src/components/race-canvas-visuals";
import { isTelemetryStale } from "@/src/components/telemetry-freshness";
import { useRaceStore } from "@/src/store/use-race-store";

const CAMERA_HALF_HEIGHT = 140;
const DRIVER_COLORS = [0x22d3ee, 0xfb7185, 0xfacc15, 0x4ade80, 0xc084fc, 0xf97316, 0x60a5fa];

const getDriverColor = (driverId: string) => {
  const hash = Array.from(driverId).reduce((acc, character) => ((acc * 33) ^ character.charCodeAt(0)) >>> 0, 5381);
  return DRIVER_COLORS[hash % DRIVER_COLORS.length];
};

const disposeMesh = (scene: THREE.Scene, mesh: THREE.Mesh) => {
  scene.remove(mesh);
  mesh.geometry.dispose();
  (mesh.material as THREE.MeshBasicMaterial).dispose();
};

type RaceCanvasProps = {
  focusModeEnabled?: boolean;
};

export const RaceCanvas = ({ focusModeEnabled = false }: RaceCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
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
    const container = canvasRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-220, 220, 140, -140, 0.1, 1000);
    camera.position.set(0, 0, 300);
    camera.lookAt(0, 0, 0);
    const cameraLookAt = new THREE.Vector3(0, 0, 0);
    const cameraFocus = new THREE.Vector2(0, 0);
    const cameraTargetPosition = new THREE.Vector2(0, 0);

    const trackMaterial = new THREE.LineBasicMaterial({ color: 0x334155 });
    const trackPoints = Array.from({ length: 120 }).map((_, index) => {
      const theta = (index / 120) * Math.PI * 2;
      const radius = 120 + Math.sin(theta * 3) * 14;
      return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
    });

    const trackGeometry = new THREE.BufferGeometry().setFromPoints([...trackPoints, trackPoints[0]]);
    const track = new THREE.Line(trackGeometry, trackMaterial);
    scene.add(track);

    const meshes: Record<string, THREE.Mesh> = {};
    const haloMeshes: Record<string, THREE.Mesh> = {};
    let lastFrameAt = performance.now();
    let frameCount = 0;
    let rafId = 0;

    const syncViewport = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const aspect = width > 0 && height > 0 ? width / height : 220 / CAMERA_HALF_HEIGHT;
      const horizontalHalf = CAMERA_HALF_HEIGHT * aspect;

      renderer.setSize(width, height);
      camera.left = -horizontalHalf;
      camera.right = horizontalHalf;
      camera.top = CAMERA_HALF_HEIGHT;
      camera.bottom = -CAMERA_HALF_HEIGHT;
      camera.updateProjectionMatrix();
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
        const driverColor = getDriverColor(tick.driverId);
        const visualState = getDriverVisualState({
          driverId: tick.driverId,
          elapsedMs: now,
          selectedDriverId: activeSelectedDriverId
        });
        const existing = meshes[tick.driverId];
        if (existing) {
          existing.position.lerp(new THREE.Vector3(tick.position.x, tick.position.y, 0), 0.22);
          existing.scale.lerp(new THREE.Vector3(visualState.scale, visualState.scale, 1), 0.24);
          (existing.material as THREE.MeshBasicMaterial).opacity = visualState.opacity;
        } else {
          const geometry = new THREE.CircleGeometry(4.6, 24);
          const material = new THREE.MeshBasicMaterial({
            color: driverColor,
            transparent: true,
            opacity: visualState.opacity
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(tick.position.x, tick.position.y, 0);
          mesh.scale.set(visualState.scale, visualState.scale, 1);
          meshes[tick.driverId] = mesh;
          scene.add(mesh);
        }

        const existingHalo = haloMeshes[tick.driverId];
        if (visualState.haloOpacity > 0) {
          if (existingHalo) {
            existingHalo.position.lerp(new THREE.Vector3(tick.position.x, tick.position.y, -0.1), 0.22);
            existingHalo.scale.lerp(new THREE.Vector3(visualState.haloScale, visualState.haloScale, 1), 0.2);
            (existingHalo.material as THREE.MeshBasicMaterial).opacity = visualState.haloOpacity;
          } else {
            const haloGeometry = new THREE.RingGeometry(6.2, 8.1, 36);
            const haloMaterial = new THREE.MeshBasicMaterial({
              color: driverColor,
              depthTest: false,
              depthWrite: false,
              opacity: visualState.haloOpacity,
              side: THREE.DoubleSide,
              transparent: true
            });
            const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
            haloMesh.position.set(tick.position.x, tick.position.y, -0.1);
            haloMesh.scale.set(visualState.haloScale, visualState.haloScale, 1);
            haloMeshes[tick.driverId] = haloMesh;
            scene.add(haloMesh);
          }
        } else if (existingHalo) {
          disposeMesh(scene, existingHalo);
          delete haloMeshes[tick.driverId];
        }
      });

      Object.keys(meshes).forEach((driverId) => {
        const hasRenderableTick = activeDriverIds.has(driverId) && Boolean(ticksRef.current[driverId]);
        if (hasRenderableTick) {
          return;
        }

        disposeMesh(scene, meshes[driverId]);
        delete meshes[driverId];
      });

      Object.keys(haloMeshes).forEach((driverId) => {
        const isSelectedDriver = activeSelectedDriverId === driverId;
        const hasRenderableTick = activeDriverIds.has(driverId) && Boolean(ticksRef.current[driverId]);
        if (isSelectedDriver && hasRenderableTick) {
          return;
        }

        disposeMesh(scene, haloMeshes[driverId]);
        delete haloMeshes[driverId];
      });

      const cameraTarget = getCameraTarget({
        focusModeEnabled: focusModeEnabledRef.current,
        selectedDriverId: activeSelectedDriverId,
        selectedDriverTick: activeSelectedDriverTick
      });
      cameraTargetPosition.set(cameraTarget.x, cameraTarget.y);
      cameraFocus.lerp(cameraTargetPosition, 0.12);
      camera.position.set(cameraFocus.x, cameraFocus.y, 300);
      cameraLookAt.set(cameraFocus.x, cameraFocus.y, 0);
      camera.lookAt(cameraLookAt);

      renderer.render(scene, camera);
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
      Object.values(meshes).forEach((mesh) => {
        disposeMesh(scene, mesh);
      });
      Object.values(haloMeshes).forEach((haloMesh) => {
        disposeMesh(scene, haloMesh);
      });
      renderer.dispose();
      trackGeometry.dispose();
      trackMaterial.dispose();
    };
  }, [setFps]);

  return <div ref={canvasRef} style={{ width: "100%", height: "100%", minHeight: 520 }} />;
};
