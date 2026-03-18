import type { TrackModel } from "@f1/core";

export type TrackMarker = {
  key: "start-finish" | "s1" | "s2" | "s3";
  label: string;
  point: TrackModel["points"][number];
};

export const buildTrackMarkers = (track: TrackModel): TrackMarker[] => {
  if (track.points.length === 0) {
    return [];
  }

  const pointAt = (fraction: number) => track.points[Math.floor(track.points.length * fraction) % track.points.length] ?? track.points[0];

  return [
    { key: "start-finish", label: "START / FINISH", point: pointAt(0) },
    { key: "s1", label: "S1", point: pointAt(1 / 3) },
    { key: "s2", label: "S2", point: pointAt(2 / 3) },
    { key: "s3", label: "S3", point: pointAt(5 / 6) }
  ];
};
