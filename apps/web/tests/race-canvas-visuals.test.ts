import { describe, expect, it } from "vitest";
import { getCameraTarget, getDriverVisualState } from "../src/components/race-canvas-visuals";

describe("race canvas visuals", () => {
  it("선택 드라이버가 없으면 모든 차량을 기본 강조로 렌더링함", () => {
    expect(
      getDriverVisualState({
        driverId: "VER",
        selectedDriverId: null
      })
    ).toEqual({
      haloOpacity: 0,
      haloScale: 0,
      opacity: 1,
      scale: 1
    });
  });

  it("선택 드라이버는 spotlight로 강조하고 나머지는 dim 처리함", () => {
    const selectedVisual = getDriverVisualState({
      driverId: "VER",
      elapsedMs: 0,
      selectedDriverId: "VER"
    });
    expect(selectedVisual.opacity).toBe(1);
    expect(selectedVisual.scale).toBe(1.55);
    expect(selectedVisual.haloOpacity).toBeCloseTo(0.38, 6);
    expect(selectedVisual.haloScale).toBeCloseTo(2.01, 6);

    expect(
      getDriverVisualState({
        driverId: "NOR",
        selectedDriverId: "VER"
      })
    ).toEqual({
      haloOpacity: 0,
      haloScale: 0,
      opacity: 0.32,
      scale: 0.78
    });
  });

  it("선택 드라이버 halo pulse는 시간 입력에 따라 결정론적으로 변함", () => {
    const base = getDriverVisualState({
      driverId: "VER",
      elapsedMs: 0,
      selectedDriverId: "VER"
    });
    const nearPeak = getDriverVisualState({
      driverId: "VER",
      elapsedMs: 196,
      selectedDriverId: "VER"
    });

    expect(nearPeak.haloOpacity).toBeGreaterThan(base.haloOpacity);
    expect(nearPeak.haloScale).toBeGreaterThan(base.haloScale);
  });

  it("focus mode이고 선택 드라이버 tick이 있으면 카메라 타깃을 선택 드라이버 위치로 이동함", () => {
    expect(
      getCameraTarget({
        focusModeEnabled: true,
        selectedDriverId: "VER",
        selectedDriverTick: {
          position: {
            x: 41.5,
            y: -12.25
          }
        }
      })
    ).toEqual({
      x: 41.5,
      y: -12.25
    });
  });

  it("focus mode가 아니면 선택 드라이버 tick이 있어도 중앙 구도를 유지함", () => {
    expect(
      getCameraTarget({
        focusModeEnabled: false,
        selectedDriverId: "VER",
        selectedDriverTick: {
          position: {
            x: 41.5,
            y: -12.25
          }
        }
      })
    ).toEqual({
      x: 0,
      y: 0
    });
  });

  it("focus mode여도 선택 드라이버 tick이 없으면 중앙 구도를 유지함", () => {
    expect(
      getCameraTarget({
        focusModeEnabled: true,
        selectedDriverId: "VER",
        selectedDriverTick: null
      })
    ).toEqual({
      x: 0,
      y: 0
    });
  });
});
