import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceCanvas } from "../src/components/race-canvas";
import { TELEMETRY_STALE_MS } from "../src/components/telemetry-freshness";
import { useRaceStore } from "../src/store/use-race-store";

type RafCallback = (timestampMs: number) => void;
type MockCamera = {
  bottom: number;
  left: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  projectionUpdates: number;
  right: number;
  top: number;
};
type MockRenderer = {
  domElement: HTMLCanvasElement;
  height: number;
  sizeHistory: Array<{
    height: number;
    width: number;
  }>;
  width: number;
};
type MockResizeObserverInstance = {
  callback: ResizeObserverCallback;
  observedElement: Element | null;
  trigger: () => void;
};
type MockScene = {
  children: unknown[];
};
type MockMesh = {
  geometry: {
    kind: string;
  };
  material: {
    color: number;
    opacity: number;
  };
};
type ThreeTestState = {
  cameras: MockCamera[];
  nextRafId: number;
  nowMs: number;
  rafCallbacks: Map<number, RafCallback>;
  renderers: MockRenderer[];
  resizeObservers: MockResizeObserverInstance[];
  scenes: MockScene[];
  systemTimeMs: number;
  reset: () => void;
  stepFrame: (nextTime?: number) => void;
};

const { threeTestState } = vi.hoisted(() => {
  const state: ThreeTestState = {
    cameras: [],
    nextRafId: 1,
    nowMs: 0,
    rafCallbacks: new Map<number, RafCallback>(),
    renderers: [],
    resizeObservers: [],
    scenes: [],
    systemTimeMs: 100000,
    reset() {
      state.cameras.length = 0;
      state.nextRafId = 1;
      state.nowMs = 0;
      state.rafCallbacks.clear();
      state.renderers.length = 0;
      state.resizeObservers.length = 0;
      state.scenes.length = 0;
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
    threeTestState: state
  };
});

vi.mock("three", () => {
  class Vector2 {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }

    set(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }

    lerp(target: Vector2, alpha: number) {
      this.x += (target.x - this.x) * alpha;
      this.y += (target.y - this.y) * alpha;
      return this;
    }
  }

  class Vector3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }

    lerp(target: Vector3, alpha: number) {
      this.x += (target.x - this.x) * alpha;
      this.y += (target.y - this.y) * alpha;
      this.z += (target.z - this.z) * alpha;
      return this;
    }
  }

  class Scene {
    children: unknown[];

    constructor() {
      this.children = [];
      threeTestState.scenes.push(this);
    }

    add(object: unknown) {
      this.children.push(object);
    }

    remove(object: unknown) {
      this.children = this.children.filter((child) => child !== object);
    }
  }

  class WebGLRenderer {
    domElement: HTMLCanvasElement;
    height: number;
    sizeHistory: Array<{
      height: number;
      width: number;
    }>;
    width: number;

    constructor() {
      this.domElement = document.createElement("canvas");
      this.height = 0;
      this.sizeHistory = [];
      this.width = 0;
      threeTestState.renderers.push(this);
    }

    setSize(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.sizeHistory.push({ height, width });
    }

    render() {}

    dispose() {}
  }

  class OrthographicCamera {
    bottom: number;
    left: number;
    position: Vector3;
    projectionUpdates: number;
    right: number;
    top: number;

    constructor(left: number, right: number, top: number, bottom: number) {
      this.bottom = bottom;
      this.left = left;
      this.position = new Vector3();
      this.projectionUpdates = 0;
      this.right = right;
      this.top = top;
      threeTestState.cameras.push(this);
    }

    lookAt() {}

    updateProjectionMatrix() {
      this.projectionUpdates += 1;
    }
  }

  class LineBasicMaterial {
    color: number;

    constructor(input: { color: number }) {
      this.color = input.color;
    }

    dispose() {}
  }

  class MeshBasicMaterial {
    color: number;
    depthTest?: boolean;
    depthWrite?: boolean;
    opacity: number;
    side?: string;
    transparent: boolean;

    constructor(input: {
      color: number;
      depthTest?: boolean;
      depthWrite?: boolean;
      opacity: number;
      side?: string;
      transparent: boolean;
    }) {
      this.color = input.color;
      this.depthTest = input.depthTest;
      this.depthWrite = input.depthWrite;
      this.opacity = input.opacity;
      this.side = input.side;
      this.transparent = input.transparent;
    }

    dispose() {}
  }

  class BufferGeometry {
    kind: string;

    constructor() {
      this.kind = "buffer";
    }

    setFromPoints() {
      return this;
    }

    dispose() {}
  }

  class CircleGeometry {
    kind: string;

    constructor() {
      this.kind = "circle";
    }

    dispose() {}
  }

  class RingGeometry {
    kind: string;

    constructor() {
      this.kind = "ring";
    }

    dispose() {}
  }

  class Line {
    geometry: BufferGeometry;
    material: LineBasicMaterial;
    position: Vector3;
    scale: Vector3;

    constructor(geometry: BufferGeometry, material: LineBasicMaterial) {
      this.geometry = geometry;
      this.material = material;
      this.position = new Vector3();
      this.scale = new Vector3(1, 1, 1);
    }
  }

  class Mesh {
    geometry: CircleGeometry | RingGeometry;
    material: MeshBasicMaterial;
    position: Vector3;
    scale: Vector3;

    constructor(geometry: CircleGeometry | RingGeometry, material: MeshBasicMaterial) {
      this.geometry = geometry;
      this.material = material;
      this.position = new Vector3();
      this.scale = new Vector3(1, 1, 1);
    }
  }

  return {
    BufferGeometry,
    CircleGeometry,
    DoubleSide: "DoubleSide",
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    RingGeometry,
    Scene,
    Vector2,
    Vector3,
    WebGLRenderer
  };
});

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

  return {
    ...rendered,
    setContainerSize(nextWidth: number, nextHeight: number) {
      height = nextHeight;
      width = nextWidth;
    }
  };
};

const stepFrame = (nextTime?: number) => {
  act(() => {
    threeTestState.stepFrame(nextTime);
  });
};

const triggerResizeObserver = (index = 0) => {
  act(() => {
    threeTestState.resizeObservers[index]?.trigger();
  });
};

const getPrimaryCamera = () => {
  const camera = threeTestState.cameras[0];

  if (!camera) {
    throw new Error("Camera not found");
  }

  return camera;
};

const getPrimaryRenderer = () => {
  const renderer = threeTestState.renderers[0];

  if (!renderer) {
    throw new Error("Renderer not found");
  }

  return renderer;
};

const getLastRendererSize = () => {
  const renderer = getPrimaryRenderer();
  return renderer.sizeHistory[renderer.sizeHistory.length - 1];
};

const getSceneMeshes = (kind: string): MockMesh[] => {
  const scene = threeTestState.scenes[0];
  if (!scene) {
    return [];
  }

  return scene.children.filter((child: unknown): child is MockMesh => {
    if (typeof child !== "object" || child === null || !("geometry" in child)) {
      return false;
    }

    const geometry = (child as { geometry?: { kind?: string } }).geometry;
    return geometry?.kind === kind;
  });
};

const countSceneMeshes = (kind: string) => {
  return getSceneMeshes(kind).length;
};

describe("race canvas lifecycle", () => {
  beforeEach(() => {
    threeTestState.reset();
    vi.spyOn(Date, "now").mockImplementation(() => threeTestState.systemTimeMs);
    seedRaceState();
    vi.stubGlobal("requestAnimationFrame", (callback: RafCallback) => {
      const id = threeTestState.nextRafId;
      threeTestState.nextRafId += 1;
      threeTestState.rafCallbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      threeTestState.rafCallbacks.delete(id);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        callback: ResizeObserverCallback;
        observedElement: Element | null;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
          this.observedElement = null;
          threeTestState.resizeObservers.push(this);
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
    vi.spyOn(performance, "now").mockImplementation(() => threeTestState.nowMs);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("선택 드라이버가 바뀌어도 renderer를 다시 만들지 않음", () => {
    renderCanvas();

    stepFrame(16);

    expect(threeTestState.renderers).toHaveLength(1);
    expect(threeTestState.scenes).toHaveLength(1);
    expect(countSceneMeshes("circle")).toBe(2);
    expect(countSceneMeshes("ring")).toBe(1);

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    stepFrame(32);

    expect(threeTestState.renderers).toHaveLength(1);
    expect(threeTestState.scenes).toHaveLength(1);
    expect(countSceneMeshes("circle")).toBe(2);
    expect(countSceneMeshes("ring")).toBe(1);
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

    expect(countSceneMeshes("circle")).toBe(2);
    expect(getSceneMeshes("circle").every((mesh) => mesh.material.opacity === 1)).toBe(true);
    expect(countSceneMeshes("ring")).toBe(0);
    expect(getPrimaryCamera().position.x).toBe(0);
    expect(getPrimaryCamera().position.y).toBe(0);
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

    const remainingCircle = getSceneMeshes("circle")[0];
    expect(countSceneMeshes("circle")).toBe(1);
    expect(countSceneMeshes("ring")).toBe(0);
    expect(remainingCircle.material.opacity).toBe(1);
    expect(getPrimaryCamera().position.x).toBe(0);
    expect(getPrimaryCamera().position.y).toBe(0);
  });

  it("드라이버 이탈 중 stale 선택은 생존 차량을 유지하고 선택 복구 뒤 halo 색도 일치함", () => {
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

    const initialCircles = getSceneMeshes("circle");
    const norCircleBeforeRemoval = initialCircles.find((mesh) => mesh.material.opacity < 1);
    expect(norCircleBeforeRemoval).toBeDefined();
    const norColorBeforeRemoval = norCircleBeforeRemoval?.material.color;
    const cameraBeforeRemovalX = getPrimaryCamera().position.x;
    const cameraBeforeRemovalY = getPrimaryCamera().position.y;
    expect(countSceneMeshes("ring")).toBe(1);
    expect(cameraBeforeRemovalX).toBeGreaterThan(0);
    expect(cameraBeforeRemovalY).toBeGreaterThan(0);

    act(() => {
      useRaceStore.setState((state) => ({
        drivers: state.drivers.filter((driver) => driver.id !== "VER")
      }));
    });

    stepFrame(32);

    expect(threeTestState.renderers).toHaveLength(1);
    const remainingCircle = getSceneMeshes("circle")[0];
    expect(countSceneMeshes("circle")).toBe(1);
    expect(countSceneMeshes("ring")).toBe(0);
    expect(remainingCircle.material.opacity).toBe(1);
    expect(remainingCircle.material.color).toBe(norColorBeforeRemoval);
    expect(getPrimaryCamera().position.x).toBeLessThan(cameraBeforeRemovalX);
    expect(getPrimaryCamera().position.y).toBeLessThan(cameraBeforeRemovalY);

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    stepFrame(48);

    const repairedHalo = getSceneMeshes("ring")[0];
    expect(countSceneMeshes("ring")).toBe(1);
    expect(repairedHalo.material.color).toBe(remainingCircle.material.color);
  });

  it("container resize는 renderer 크기와 orthographic projection을 함께 갱신함", () => {
    const { setContainerSize } = renderCanvas();

    setContainerSize(560, 280);
    triggerResizeObserver();

    expect(getLastRendererSize()).toEqual({ height: 280, width: 560 });
    expect(getPrimaryCamera().left).toBe(-280);
    expect(getPrimaryCamera().right).toBe(280);
    expect(getPrimaryCamera().top).toBe(140);
    expect(getPrimaryCamera().bottom).toBe(-140);
    expect(getPrimaryCamera().projectionUpdates).toBeGreaterThan(0);

    const projectionUpdates = getPrimaryCamera().projectionUpdates;

    setContainerSize(280, 280);
    triggerResizeObserver();

    expect(getLastRendererSize()).toEqual({ height: 280, width: 280 });
    expect(getPrimaryCamera().left).toBe(-140);
    expect(getPrimaryCamera().right).toBe(140);
    expect(getPrimaryCamera().top).toBe(140);
    expect(getPrimaryCamera().bottom).toBe(-140);
    expect(getPrimaryCamera().projectionUpdates).toBeGreaterThan(projectionUpdates);
  });
});
