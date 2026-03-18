import { contextBridge } from "electron";
import { buildDesktopRuntimeForPreload } from "./runtime/runtime-context.js";

contextBridge.exposeInMainWorld(
  "desktopShell",
  buildDesktopRuntimeForPreload({
    argv: process.argv,
    fallback: {
      platform: process.platform,
      versions: {
        chrome: process.versions.chrome,
        electron: process.versions.electron,
        node: process.versions.node
      },
      isPackaged: process.defaultApp !== true
    }
  })
);
