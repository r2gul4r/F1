export {};

declare global {
  interface Window {
    desktopShell: {
      platform: string;
      versions: {
        chrome: string;
        electron: string;
        node: string;
      };
    };
  }
}
