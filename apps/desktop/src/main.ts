import { app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDesktopRuntimeArgument, resolveDesktopRuntimeContext } from "./runtime/runtime-context.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rendererDevUrl = process.env.DESKTOP_RENDERER_URL ?? "http://127.0.0.1:5173";

const createMainWindow = () => {
  const desktopRuntime = resolveDesktopRuntimeContext({
    platform: process.platform,
    versions: {
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      node: process.versions.node
    },
    isPackaged: app.isPackaged
  });

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#07111f",
    title: `F1 Pulse Desktop (${desktopRuntime.mode})`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [createDesktopRuntimeArgument(desktopRuntime)],
      preload: join(currentDirectory, "preload.js")
    }
  });

  if (app.isPackaged) {
    void window.loadFile(join(currentDirectory, "renderer", "index.html"));
    return;
  }

  void window.loadURL(rendererDevUrl);
  window.webContents.openDevTools({ mode: "detach" });
};

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
