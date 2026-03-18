import type { DesktopRuntimeContext } from "../runtime/runtime-context.js";

export {};

declare global {
  interface Window {
    desktopShell: DesktopRuntimeContext;
  }
}
