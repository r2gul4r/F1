import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRaceStore } from "../src/store/use-race-store";

const watchClientSpy = vi.fn();

vi.mock("@/src/components/watch-client", () => ({
  WatchClient: (props: { previewMode?: boolean; sessionId: string; watchToken: string }) => {
    watchClientSpy(props);
    return <div data-testid="watch-client-replay" />;
  }
}));

describe("watch replay client", () => {
  beforeEach(() => {
    watchClientSpy.mockClear();
    useRaceStore.setState({
      drivers: [],
      ticksByDriver: {},
      selectedDriverId: null,
      flag: null,
      predictions: [],
      fps: 9
    });
  });

  afterEach(() => {
    cleanup();
    useRaceStore.getState().resetSessionState();
    useRaceStore.getState().setFps(0);
  });

  it("mounts a fixed replay snapshot and forwards preview props to WatchClient", async () => {
    const { WatchReplayClient } = await import("../src/components/watch-replay-client");

    render(<WatchReplayClient />);

    expect(screen.getByTestId("watch-client-replay")).toBeTruthy();
    expect(watchClientSpy).toHaveBeenCalledWith({
      previewMode: true,
      sessionId: "desktop-replay-session",
      watchToken: "replay-token"
    });

    const state = useRaceStore.getState();
    expect(state.drivers.map((driver) => driver.id)).toEqual(["NOR", "VER", "LEC", "RUS"]);
    expect(state.predictions.map((prediction) => prediction.lap)).toEqual([26, 27]);
    expect(state.flag?.flagType).toBe("GREEN");
  });
});
