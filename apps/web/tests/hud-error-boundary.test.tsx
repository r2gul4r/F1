import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HudErrorBoundary } from "../src/components/hud-error-boundary";

const MaybeExplodingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("hud failure");
  }

  return <div>HUD ok</div>;
};

describe("hud error boundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("정상 child는 그대로 렌더링함", () => {
    render(
      <HudErrorBoundary>
        <MaybeExplodingChild shouldThrow={false} />
      </HudErrorBoundary>
    );

    expect(screen.getByText("HUD ok")).toBeTruthy();
  });

  it("child가 실패하면 fallback을 렌더링함", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <HudErrorBoundary>
        <MaybeExplodingChild shouldThrow />
      </HudErrorBoundary>
    );

    expect(screen.getByText("HUD 일시 중단")).toBeTruthy();
  });

  it("다른 key로 remount되면 fallback에서 회복할 수 있음", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const view = render(
      <HudErrorBoundary key="session-1:VER">
        <MaybeExplodingChild shouldThrow />
      </HudErrorBoundary>
    );

    expect(screen.getByText("HUD 일시 중단")).toBeTruthy();

    view.rerender(
      <HudErrorBoundary key="session-2:VER">
        <MaybeExplodingChild shouldThrow={false} />
      </HudErrorBoundary>
    );

    expect(screen.getByText("HUD ok")).toBeTruthy();
    expect(screen.queryByText("HUD 일시 중단")).toBeNull();
  });
});
