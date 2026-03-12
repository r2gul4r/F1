import { describe, expect, it } from "vitest";
import { getDriverVisualState } from "../src/components/race-canvas-visuals";

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
});
