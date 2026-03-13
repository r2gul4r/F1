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
      opacity: 1,
      scale: 1
    });
  });

  it("선택 드라이버는 spotlight로 강조하고 나머지는 dim 처리함", () => {
    expect(
      getDriverVisualState({
        driverId: "VER",
        selectedDriverId: "VER"
      })
    ).toEqual({
      opacity: 1,
      scale: 1.55
    });

    expect(
      getDriverVisualState({
        driverId: "NOR",
        selectedDriverId: "VER"
      })
    ).toEqual({
      opacity: 0.32,
      scale: 0.78
    });
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
