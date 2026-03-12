"use client";

import React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getDriverVisualState } from "@/src/components/race-canvas-visuals";
import { useRaceStore } from "@/src/store/use-race-store";

const DRIVER_COLORS = [0x22d3ee, 0xfb7185, 0xfacc15, 0x4ade80, 0xc084fc, 0xf97316, 0x60a5fa];

export const RaceCanvas = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const ticksRef = useRef(useRaceStore.getState().ticksByDriver);
  const selectedDriverIdRef = useRef(useRaceStore.getState().selectedDriverId);
  const ticksByDriver = useRaceStore((state) => state.ticksByDriver);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const setFps = useRaceStore((state) => state.setFps);

  useEffect(() => {
    ticksRef.current = ticksByDriver;
  }, [ticksByDriver]);

  useEffect(() => {
    selectedDriverIdRef.current = selectedDriverId;
  }, [selectedDriverId]);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-220, 220, 140, -140, 0.1, 1000);
    camera.position.set(0, 0, 300);
    camera.lookAt(0, 0, 0);

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
    let lastFrameAt = performance.now();
    let frameCount = 0;
    let rafId = 0;

    const animate = () => {
      frameCount += 1;
      const now = performance.now();
      const delta = now - lastFrameAt;

      if (delta >= 1000) {
        setFps((frameCount / delta) * 1000);
        frameCount = 0;
        lastFrameAt = now;
      }

      const ticks = Object.values(ticksRef.current);
      ticks.forEach((tick, index) => {
        const visualState = getDriverVisualState({
          driverId: tick.driverId,
          selectedDriverId: selectedDriverIdRef.current
        });
        const existing = meshes[tick.driverId];
        if (existing) {
          existing.position.lerp(new THREE.Vector3(tick.position.x, tick.position.y, 0), 0.22);
          existing.scale.lerp(new THREE.Vector3(visualState.scale, visualState.scale, 1), 0.24);
          (existing.material as THREE.MeshBasicMaterial).opacity = visualState.opacity;
          return;
        }

        const geometry = new THREE.CircleGeometry(4.6, 24);
        const material = new THREE.MeshBasicMaterial({
          color: DRIVER_COLORS[index % DRIVER_COLORS.length],
          transparent: true,
          opacity: visualState.opacity
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(tick.position.x, tick.position.y, 0);
        mesh.scale.set(visualState.scale, visualState.scale, 1);
        meshes[tick.driverId] = mesh;
        scene.add(mesh);
      });

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      trackGeometry.dispose();
      trackMaterial.dispose();
    };
  }, [selectedDriverId, setFps]);

  return <div ref={canvasRef} style={{ width: "100%", height: "100%", minHeight: 520 }} />;
};
