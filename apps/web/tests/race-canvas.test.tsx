import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceCanvas } from "../src/components/race-canvas";
import { TELEMETRY_STALE_MS } from "../src/components/telemetry-freshness";
import { useRaceStore } from "../src/store/use-race-store";

type RafCallback = (timestampMs: number) => void;
type DrawOperation =
  | {
      type: "fill";
      fillStyle: string;
      globalAlpha: number;
      radius: number;
    }
  | {
      type: "scale";
      x: number;
      y: number;
    }
  | {
      type: "stroke";
      globalAlpha: number;
      lineWidth: number;
      radius: number;
      strokeStyle: string;
    }
  | {
      type: "translate";
      x: number;
      y: number;
    };

type DrawFrame = {
  operations: DrawOperation[];
};

type MockCanvasContext = {
  beginPath: () => void;
  clearRect: () => void;
  currentFrame: DrawFrame | null;
  fill: () => void;
  fillStyle: string;
  frames: DrawFrame[];
  globalAlpha: number;
  lastArcRadius: number;
  lineTo: () => void;
  lineWidth: number;
  moveTo: () => void;
  restore: () => void;
  save: () => void;
  scale: (x: number, y: number) => void;
  setTransform: () => void;
  stroke: () => void;
  strokeStyle: string;
  translate: (x: number, y: number) => void;
  arc: (_x: number, _y: number, radius: number) => void;
  closePath: () => void;
};

type MockResizeObserverInstance = {
  callback: ResizeObserverCallback;
  observedElement: Element | null;
  trigger: () => void;
};

type CanvasTestState = {
  contexts: MockCanvasContext[];
  nextRafId: number;
  nowMs: number;
  rafCallbacks: Map<number, RafCallback>;
  resizeObservers: MockResizeObserverInstance[];
  systemTimeMs: number;
  reset: () => void;
  stepFrame: (nextTime?: number) => void;
};

const { canvasTestState } = vi.hoisted(() => {
  const state: CanvasTestState = {
    contexts: [],
    nextRafId: 1,
    nowMs: 0,
    rafCallbacks: new Map<number, RafCallback>(),
    resizeObservers: [],
    systemTimeMs: 100000,
    reset() {
      state.contexts.length = 0;
      state.nextRafId = 1;
      state.nowMs = 0;
      state.rafCallbacks.clear();
      state.resizeObservers.length = 0;
      state.systemTimeMs = 100000;
    },
    stepFrame(nextTime = state.nowMs + 16) {
      state.nowMs = nextTime;
      const callbacks = Array.from(state.rafCallbacks.values());
      state.rafCallbacks.clear();
      callbacks.forEach((callback) => callback(nextTime));
    }
  };

  return {
    canvasTestState: state
  };
});

const createMockCanvasContext = (): MockCanvasContext => {
  const context: MockCanvasContext = {
    beginPath() {
      context.lastArcRadius = 0;
    },
    clearRect() {
      context.currentFrame = {
        operations: []
      };
      context.frames.push(context.currentFrame);
    },
    closePath() {},
    currentFrame: null,
    fill() {
      if (!context.currentFrame) {
        return;
      }

      context.currentFrame.operations.push({
        type: "fill",
        fillStyle: context.fillStyle,
        globalAlpha: context.globalAlpha,
        radius: context.lastArcRadius
      });
    },
    fillStyle: "",
    frames: [],
    globalAlpha: 1,
    lastArcRadius: 0,
    lineTo() {},
    lineWidth: 1,
    moveTo() {},
    restore() {},
    save() {},
    scale(x: number, y: number) {
      if (!context.currentFrame) {
        return;
      }

      context.currentFrame.operations.push({
        type: "scale",
        x,
        y
      });
    },
    setTransform() {},
    stroke() {
      if (!context.currentFrame) {
        return;
      }

      context.currentFrame.operations.push({
        type: "stroke",
        globalAlpha: context.globalAlpha,
        lineWidth: context.lineWidth,
        radius: context.lastArcRadius,
        strokeStyle: context.strokeStyle
      });
    },
    strokeStyle: "",
    translate(x: number, y: number) {
      if (!context.currentFrame) {
        return;
      }

      context.currentFrame.operations.push({
        type: "translate",
        x,
        y
      });
    },
    arc(_x: number, _y: number, radius: number) {
      context.lastArcRadius = radius;
    }
  };

  return context;
};

const seedRaceState = () => {
  const nowMs = Date.now();

  useRaceStore.setState({
    drivers: [
      {
        id: "VER",
        sessionId: "session-1",
        fullName: "Max Verstappen",
        number: 1,
        teamName: "Red Bull",
        deepLink: "https://f1tv.formula1.com"
      },
      {
        id: "NOR",
        sessionId: "session-1",
        fullName: "Lando Norris",
        number: 4,
        teamName: "McLaren",
        deepLink: "https://www.formula1.com/en/drivers/lando-norris"
      }
    ],
    ticksByDriver: {
      VER: {
        sessionId: "session-1",
        driverId: "VER",
        position: { x: 1, y: 2, z: 0 },
        speedKph: 320,
        lap: 7,
        rank: 1,
        timestampMs: nowMs - 1000
      },
      NOR: {
        sessionId: "session-1",
        driverId: "NOR",
        position: { x: 3, y: 4, z: 0 },
        speedKph: 315,
        lap: 7,
        rank: 2,
        timestampMs: nowMs - 900
      }
    },
    selectedDriverId: "VER",
    flag: null,
    predictions: [],
    fps: 0
  });
};

const renderCanvas = (props?: { focusModeEnabled?: boolean }) => {
  let height = 0;
  let width = 0;
  const rendered = render(<RaceCanvas {...props} />);
  const canvasRoot = rendered.container.firstElementChild;

  if (!(canvasRoot instanceof HTMLDivElement)) {
    throw new Error("RaceCanvas root not found");
  }

  Object.defineProperty(canvasRoot, "clientHeight", {
    configurable: true,
    get: () => height
  });
  Object.defineProperty(canvasRoot, "clientWidth", {
    configurable: true,
    get: () => width
  });

  const canvas = canvasRoot.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("RaceCanvas canvas not found");
  }

  return {
    ...rendered,
    canvas,
    setContainerSize(nextWidth: number, nextHeight: number) {
      height = nextHeight;
      width = nextWidth;
    }
  };
};

const stepFrame = (nextTime?: number) => {
  act(() => {
    canvasTestState.stepFrame(nextTime);
  });
};

const triggerResizeObserver = (index = 0) => {
  act(() => {
    canvasTestState.resizeObservers[index]?.trigger();
  });
};

const getPrimaryContext = () => {
  const context = canvasTestState.contexts[0];

  if (!context) {
    throw new Error("Canvas context not found");
  }

  return context;
};

const getLastFrame = () => {
  const context = getPrimaryContext();
  const frame = context.frames[context.frames.length - 1];

  if (!frame) {
    throw new Error("Canvas frame not found");
  }

  return frame;
};

const getCarFillOps = (frame: DrawFrame) =>
  frame.operations.filter((operation): operation is Extract<DrawOperation, { type: "fill" }> => {
    return operation.type === "fill" && operation.radius > 0;
  });

const getHaloStrokeOps = (frame: DrawFrame) =>
  frame.operations.filter((operation): operation is Extract<DrawOperation, { type: "stroke" }> => {
    return operation.type === "stroke" && operation.radius > 0;
  });

const getLastTranslate = (frame: DrawFrame) => {
  const translate = [...frame.operations]
    .reverse()
    .find((operation): operation is Extract<DrawOperation, { type: "translate" }> => operation.type === "translate");

  if (!translate) {
    throw new Error("Translate operation not found");
  }

  return translate;
};

const getFirstTranslate = (frame: DrawFrame) => {
  const translate = frame.operations.find(
    (operation): operation is Extract<DrawOperation, { type: "translate" }> => operation.type === "translate"
  );

  if (!translate) {
    throw new Error("Translate operation not found");
  }

  return translate;
};

const expectCenteredTranslate = (frame: DrawFrame) => {
  const translate = getLastTranslate(frame);
  expect(translate.type).toBe("translate");
  expect(Math.abs(translate.x)).toBe(0);
  expect(Math.abs(translate.y)).toBe(0);
};

describe("race canvas lifecycle", () => {
  beforeEach(() => {
    canvasTestState.reset();
    vi.spyOn(Date, "now").mockImplementation(() => canvasTestState.systemTimeMs);
    seedRaceState();
    vi.stubGlobal("requestAnimationFrame", (callback: RafCallback) => {
      const id = canvasTestState.nextRafId;
      canvasTestState.nextRafId += 1;
      canvasTestState.rafCallbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      canvasTestState.rafCallbacks.delete(id);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        callback: ResizeObserverCallback;
        observedElement: Element | null;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
          this.observedElement = null;
          canvasTestState.resizeObservers.push(this);
        }

        observe(element: Element) {
          this.observedElement = element;
        }

        disconnect() {
          this.observedElement = null;
        }

        trigger() {
          this.callback([], this as unknown as ResizeObserver);
        }
      }
    );
    vi.spyOn(performance, "now").mockImplementation(() => canvasTestState.nowMs);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((contextId: string) => {
      if (contextId !== "2d") {
        return null;
      }

      const context = createMockCanvasContext();
      canvasTestState.contexts.push(context);
      return context as unknown as CanvasRenderingContext2D;
    });
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 1
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("선택 드라이버가 바뀌어도 canvas context를 다시 만들지 않음", () => {
    const { canvas } = renderCanvas();

    stepFrame(16);

    expect(canvasTestState.contexts).toHaveLength(1);
    expect(canvas.ownerDocument.querySelectorAll("canvas")).toHaveLength(1);

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    stepFrame(32);

    expect(canvasTestState.contexts).toHaveLength(1);
    expect(canvas.ownerDocument.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("선택 텔레메트리가 stale이면 focus와 halo를 즉시 해제함", () => {
    useRaceStore.setState((state) => ({
      ticksByDriver: {
        ...state.ticksByDriver,
        VER: {
          ...state.ticksByDriver.VER,
          position: { x: 100, y: 50, z: 0 },
          timestampMs: Date.now() - TELEMETRY_STALE_MS - 1
        }
      }
    }));

    renderCanvas({ focusModeEnabled: true });

    stepFrame(16);

    const frame = getLastFrame();
    expect(getCarFillOps(frame)).toHaveLength(2);
    expect(getCarFillOps(frame).every((operation) => operation.globalAlpha === 1)).toBe(true);
    expect(getHaloStrokeOps(frame)).toHaveLength(0);
    expectCenteredTranslate(frame);
  });

  it("선택 드라이버 tick이 없으면 생존 차량을 dim 하지 않고 halo도 만들지 않음", () => {
    useRaceStore.setState((state) => {
      const nextTicksByDriver = { ...state.ticksByDriver };
      delete nextTicksByDriver.VER;

      return {
        ticksByDriver: nextTicksByDriver
      };
    });

    renderCanvas({ focusModeEnabled: true });

    stepFrame(16);

    const frame = getLastFrame();
    expect(getCarFillOps(frame)).toHaveLength(1);
    expect(getCarFillOps(frame)[0].globalAlpha).toBe(1);
    expect(getHaloStrokeOps(frame)).toHaveLength(0);
    expectCenteredTranslate(frame);
  });

  it("선택 드라이버가 사라지면 남은 차량은 유지되고 선택 복구 뒤 halo 색도 일치함", () => {
    useRaceStore.setState((state) => ({
      ticksByDriver: {
        ...state.ticksByDriver,
        VER: {
          ...state.ticksByDriver.VER,
          position: { x: 100, y: 50, z: 0 }
        }
      }
    }));

    renderCanvas({ focusModeEnabled: true });

    stepFrame(16);

    const initialFrame = getLastFrame();
    const dimmedFill = getCarFillOps(initialFrame).find((operation) => operation.globalAlpha < 1);
    const initialTranslate = getLastTranslate(initialFrame);
    expect(dimmedFill).toBeDefined();
    expect(getHaloStrokeOps(initialFrame)).toHaveLength(1);

    act(() => {
      useRaceStore.setState((state) => ({
        drivers: state.drivers.filter((driver) => driver.id !== "VER")
      }));
    });

    stepFrame(32);

    const removedFrame = getLastFrame();
    const remainingFill = getCarFillOps(removedFrame)[0];
    const removedTranslate = getLastTranslate(removedFrame);
    expect(getCarFillOps(removedFrame)).toHaveLength(1);
    expect(remainingFill.globalAlpha).toBe(1);
    expect(remainingFill.fillStyle).toBe(dimmedFill?.fillStyle);
    expect(getHaloStrokeOps(removedFrame)).toHaveLength(0);
    expect(Math.abs(removedTranslate.x)).toBeLessThan(Math.abs(initialTranslate.x));
    expect(Math.abs(removedTranslate.y)).toBeLessThan(Math.abs(initialTranslate.y));

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    stepFrame(48);

    const repairedFrame = getLastFrame();
    expect(getHaloStrokeOps(repairedFrame)).toHaveLength(1);
    expect(getHaloStrokeOps(repairedFrame)[0].strokeStyle).toBe(remainingFill.fillStyle);
  });

  it("container resize는 canvas 크기와 중심 translate를 함께 갱신함", () => {
    const { canvas, setContainerSize } = renderCanvas();

    setContainerSize(560, 280);
    triggerResizeObserver();
    stepFrame(16);

    expect(canvas.width).toBe(560);
    expect(canvas.height).toBe(280);
    expect(getFirstTranslate(getLastFrame())).toEqual({ type: "translate", x: 280, y: 140 });

    setContainerSize(280, 280);
    triggerResizeObserver();
    stepFrame(32);

    expect(canvas.width).toBe(280);
    expect(canvas.height).toBe(280);
    expect(getFirstTranslate(getLastFrame())).toEqual({ type: "translate", x: 140, y: 140 });
  });
});
