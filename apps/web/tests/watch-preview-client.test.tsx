import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRaceStore } from "../src/store/use-race-store";

const watchClientSpy = vi.fn();

vi.mock("@/src/components/watch-client", () => ({
  WatchClient: (props: { previewMode?: boolean; sessionId: string; watchToken: string }) => {
    watchClientSpy(props);
    return <div data-testid="watch-client-preview" />;
  }
}));

describe("watch preview client", () => {
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

  it("mount 시 preview state를 주입하고 WatchClient에 preview props를 전달함", async () => {
    const { WatchPreviewClient } = await import("../src/components/watch-preview-client");

    render(<WatchPreviewClient />);

    expect(screen.getByTestId("watch-client-preview")).toBeTruthy();
    expect(watchClientSpy).toHaveBeenCalledWith({
      previewMode: true,
      sessionId: "preview-session",
      watchToken: "preview-token"
    });

    const state = useRaceStore.getState();
    expect(state.drivers).toHaveLength(3);
    expect(Object.keys(state.ticksByDriver)).toEqual(["VER", "NOR", "LEC"]);
    expect(state.selectedDriverId).toBe("VER");
    expect(state.flag?.sessionId).toBe("preview-session");
    expect(state.predictions).toHaveLength(1);
  });

  it("unmount 시 preview session state와 fps를 정리함", async () => {
    const { WatchPreviewClient } = await import("../src/components/watch-preview-client");

    const view = render(<WatchPreviewClient />);
    expect(useRaceStore.getState().drivers).toHaveLength(3);

    useRaceStore.getState().setFps(42);
    view.unmount();

    const state = useRaceStore.getState();
    expect(state.drivers).toHaveLength(0);
    expect(state.ticksByDriver).toEqual({});
    expect(state.selectedDriverId).toBeNull();
    expect(state.flag).toBeNull();
    expect(state.predictions).toHaveLength(0);
    expect(state.fps).toBe(0);
  });
});
