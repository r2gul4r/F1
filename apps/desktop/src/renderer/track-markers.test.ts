import { describe, expect, it } from "vitest";
import { buildTrackMarkers } from "./track-markers";

describe("track markers", () => {
  it("returns start and sector markers from track points", () => {
    const markers = buildTrackMarkers({
      center: { x: 0, y: 0 },
      halfHeight: 100,
      points: Array.from({ length: 12 }).map((_, index) => ({
        x: index * 10,
        y: index * -5
      }))
    });

    expect(markers.map((marker) => marker.key)).toEqual(["start-finish", "s1", "s2", "s3"]);
    expect(markers[0]?.label).toBe("START / FINISH");
    expect(markers[1]?.point).toEqual({ x: 40, y: -20 });
  });

  it("returns no markers when the track is empty", () => {
    expect(
      buildTrackMarkers({
        center: { x: 0, y: 0 },
        halfHeight: 100,
        points: []
      })
    ).toEqual([]);
  });
});
