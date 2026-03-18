import { describe, expect, it } from "vitest";
import {
  buildDesktopRuntimeForPreload,
  createDesktopRuntimeArgument,
  resolveDesktopRuntimeContext
} from "../runtime/runtime-context.js";

describe("desktop runtime context", () => {
  it("mode/dataSource/aiProvider/publicWebRelay/sessionSource를 env 기반으로 해석함", () => {
    const runtime = resolveDesktopRuntimeContext({
      platform: "win32",
      versions: {
        chrome: "123.0.0.0",
        electron: "35.3.0",
        node: "22.0.0"
      },
      isPackaged: false,
      env: {
        DATA_SOURCE: "openf1",
        AI_PROVIDER: "gemini",
        PUBLIC_WEB_RELAY: "true",
        DESKTOP_SESSION_SOURCE: "live-stream"
      }
    });

    expect(runtime).toMatchObject({
      platform: "win32",
      mode: "development",
      dataSource: "openf1",
      aiProvider: "gemini",
      publicWebRelay: true,
      sessionSource: "live-stream"
    });
  });

  it("알 수 없는 env 값은 unknown 규칙과 fallback session source로 고정함", () => {
    const runtime = resolveDesktopRuntimeContext({
      platform: "linux",
      versions: {
        chrome: "123.0.0.0",
        electron: "35.3.0",
        node: "22.0.0"
      },
      isPackaged: true,
      env: {
        DATA_SOURCE: "unknown-source",
        AI_PROVIDER: "another-provider",
        PUBLIC_WEB_RELAY: "0",
        DESKTOP_SESSION_SOURCE: "unsupported-source"
      }
    });

    expect(runtime).toMatchObject({
      platform: "linux",
      mode: "packaged",
      dataSource: "unknown",
      aiProvider: "unknown",
      publicWebRelay: false,
      sessionSource: "unknown"
    });
  });

  it("preload bridge payload는 main에서 전달한 runtime arg shape를 그대로 사용함", () => {
    const runtimeFromMain = resolveDesktopRuntimeContext({
      platform: "win32",
      versions: {
        chrome: "123.0.0.0",
        electron: "35.3.0",
        node: "22.0.0"
      },
      isPackaged: true,
      env: {
        DATA_SOURCE: "mock",
        AI_PROVIDER: "ollama",
        PUBLIC_WEB_RELAY: "false",
        DESKTOP_SESSION_SOURCE: "replay-buffer"
      }
    });

    const runtimeForPreload = buildDesktopRuntimeForPreload({
      argv: [createDesktopRuntimeArgument(runtimeFromMain)],
      fallback: {
        platform: "linux",
        versions: {
          chrome: "0",
          electron: "0",
          node: "0"
        },
        isPackaged: false,
        env: {
          DATA_SOURCE: "openf1",
          AI_PROVIDER: "gemini",
          PUBLIC_WEB_RELAY: "true",
          DESKTOP_SESSION_SOURCE: "live-stream"
        }
      }
    });

    expect(runtimeForPreload).toEqual(runtimeFromMain);
  });

  it("runtime arg가 없으면 preload fallback 규칙으로 bridge payload를 구성함", () => {
    const runtimeForPreload = buildDesktopRuntimeForPreload({
      argv: ["--another-arg=value"],
      fallback: {
        platform: "linux",
        versions: {
          chrome: "123.0.0.0",
          electron: "35.3.0",
          node: "22.0.0"
        },
        isPackaged: false,
        env: {
          DATA_SOURCE: "mock",
          AI_PROVIDER: "disabled",
          PUBLIC_WEB_RELAY: "false",
          DESKTOP_SESSION_SOURCE: "mock-session"
        }
      }
    });

    expect(runtimeForPreload).toMatchObject({
      platform: "linux",
      mode: "development",
      dataSource: "mock",
      aiProvider: "disabled",
      publicWebRelay: false,
      sessionSource: "mock-session"
    });
  });
});
