export type DesktopRuntimeVersions = {
  chrome: string;
  electron: string;
  node: string;
};

export type DesktopRuntimeMode = "development" | "packaged";
export type DesktopDataSource = "mock" | "openf1" | "unknown";
export type DesktopAiProvider = "disabled" | "ollama" | "gemini" | "unknown";
export type DesktopSessionSource = "mock-session" | "replay-buffer" | "live-stream" | "unknown";
export type DesktopSessionSourceOption = {
  key: DesktopSessionSource;
  label: string;
  disabled: boolean;
  disabledReason: string | null;
};

export type DesktopRuntimeContext = {
  platform: string;
  versions: DesktopRuntimeVersions;
  mode: DesktopRuntimeMode;
  dataSource: DesktopDataSource;
  aiProvider: DesktopAiProvider;
  publicWebRelay: boolean;
  sessionSource: DesktopSessionSource;
  sessionSourceOptions: DesktopSessionSourceOption[];
};

const desktopRuntimeArgumentPrefix = "--desktop-runtime-context=";

type RuntimeProcessEnv = Partial<Record<"AI_PROVIDER" | "DATA_SOURCE" | "DESKTOP_SESSION_SOURCE" | "PUBLIC_WEB_RELAY", string | undefined>>;

type ResolveDesktopRuntimeContextInput = {
  platform: string;
  versions: DesktopRuntimeVersions;
  isPackaged: boolean;
  env?: RuntimeProcessEnv;
};

const defaultDesktopSessionSourceOptions: DesktopSessionSourceOption[] = [
  {
    key: "mock-session",
    label: "Mock session",
    disabled: false,
    disabledReason: null
  },
  {
    key: "replay-buffer",
    label: "Replay session",
    disabled: false,
    disabledReason: null
  },
  {
    key: "live-stream",
    label: "Live stream",
    disabled: true,
    disabledReason: "local live-stream adapter is not wired yet."
  }
];

const asLowerText = (value: string | undefined): string => (value ?? "").trim().toLowerCase();

const toMode = (isPackaged: boolean): DesktopRuntimeMode => (isPackaged ? "packaged" : "development");

const toDataSource = (env: RuntimeProcessEnv): DesktopDataSource => {
  const source = asLowerText(env.DATA_SOURCE);
  if (source === "mock") {
    return "mock";
  }

  if (source === "openf1") {
    return "openf1";
  }

  return "unknown";
};

const toAiProvider = (env: RuntimeProcessEnv): DesktopAiProvider => {
  const provider = asLowerText(env.AI_PROVIDER);
  if (provider === "disabled") {
    return "disabled";
  }

  if (provider === "ollama") {
    return "ollama";
  }

  if (provider === "gemini") {
    return "gemini";
  }

  return "unknown";
};

const toPublicWebRelay = (env: RuntimeProcessEnv): boolean => {
  const flag = asLowerText(env.PUBLIC_WEB_RELAY);
  return flag === "1" || flag === "true" || flag === "yes";
};

const toSessionSource = (env: RuntimeProcessEnv, dataSource: DesktopDataSource): DesktopSessionSource => {
  const sessionSource = asLowerText(env.DESKTOP_SESSION_SOURCE);
  if (sessionSource === "mock-session") {
    return "mock-session";
  }

  if (sessionSource === "replay-buffer") {
    return "replay-buffer";
  }

  if (sessionSource === "live-stream") {
    return "live-stream";
  }

  if (dataSource === "mock") {
    return "mock-session";
  }

  if (dataSource === "openf1") {
    return "replay-buffer";
  }

  return "unknown";
};

const isDesktopRuntimeMode = (value: unknown): value is DesktopRuntimeMode =>
  value === "development" || value === "packaged";

const isDesktopDataSource = (value: unknown): value is DesktopDataSource =>
  value === "mock" || value === "openf1" || value === "unknown";

const isDesktopAiProvider = (value: unknown): value is DesktopAiProvider =>
  value === "disabled" || value === "ollama" || value === "gemini" || value === "unknown";

const isDesktopSessionSource = (value: unknown): value is DesktopSessionSource =>
  value === "mock-session" || value === "replay-buffer" || value === "live-stream" || value === "unknown";

const isDesktopSessionSourceOption = (value: unknown): value is DesktopSessionSourceOption => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    key?: unknown;
    label?: unknown;
    disabled?: unknown;
    disabledReason?: unknown;
  };

  return (
    isDesktopSessionSource(candidate.key) &&
    typeof candidate.label === "string" &&
    typeof candidate.disabled === "boolean" &&
    (typeof candidate.disabledReason === "string" || candidate.disabledReason === null)
  );
};

const buildDesktopSessionSourceOptions = (): DesktopSessionSourceOption[] =>
  defaultDesktopSessionSourceOptions.map((option) => ({ ...option }));

const toDesktopRuntimeContext = (value: unknown): DesktopRuntimeContext | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    platform?: unknown;
    versions?: {
      chrome?: unknown;
      electron?: unknown;
      node?: unknown;
    };
    mode?: unknown;
    dataSource?: unknown;
    aiProvider?: unknown;
    publicWebRelay?: unknown;
    sessionSource?: unknown;
    sessionSourceOptions?: unknown;
  };

  const versions = candidate.versions;
  if (
    typeof candidate.platform !== "string" ||
    !versions ||
    typeof versions.chrome !== "string" ||
    typeof versions.electron !== "string" ||
    typeof versions.node !== "string" ||
    !isDesktopRuntimeMode(candidate.mode) ||
    !isDesktopDataSource(candidate.dataSource) ||
    !isDesktopAiProvider(candidate.aiProvider) ||
    typeof candidate.publicWebRelay !== "boolean" ||
    !isDesktopSessionSource(candidate.sessionSource)
  ) {
    return null;
  }

  const sessionSourceOptions =
    Array.isArray(candidate.sessionSourceOptions) && candidate.sessionSourceOptions.every(isDesktopSessionSourceOption)
      ? candidate.sessionSourceOptions.map((option) => ({ ...option }))
      : buildDesktopSessionSourceOptions();

  return {
    platform: candidate.platform,
    versions: {
      chrome: versions.chrome,
      electron: versions.electron,
      node: versions.node
    },
    mode: candidate.mode,
    dataSource: candidate.dataSource,
    aiProvider: candidate.aiProvider,
    publicWebRelay: candidate.publicWebRelay,
    sessionSource: candidate.sessionSource,
    sessionSourceOptions
  };
};

export const resolveDesktopRuntimeContext = (input: ResolveDesktopRuntimeContextInput): DesktopRuntimeContext => {
  const env = input.env ?? process.env;
  const dataSource = toDataSource(env);

  return {
    platform: input.platform,
    versions: {
      ...input.versions
    },
    mode: toMode(input.isPackaged),
    dataSource,
    aiProvider: toAiProvider(env),
    publicWebRelay: toPublicWebRelay(env),
    sessionSource: toSessionSource(env, dataSource),
    sessionSourceOptions: buildDesktopSessionSourceOptions()
  };
};

export const createDesktopRuntimeArgument = (runtime: DesktopRuntimeContext): string =>
  `${desktopRuntimeArgumentPrefix}${encodeURIComponent(JSON.stringify(runtime))}`;

export const readDesktopRuntimeFromArgv = (argv: readonly string[]): DesktopRuntimeContext | null => {
  const encoded = argv.find((item) => item.startsWith(desktopRuntimeArgumentPrefix));
  if (!encoded) {
    return null;
  }

  try {
    const payload = decodeURIComponent(encoded.slice(desktopRuntimeArgumentPrefix.length));
    return toDesktopRuntimeContext(JSON.parse(payload));
  } catch {
    return null;
  }
};

type BuildDesktopRuntimeForPreloadInput = {
  argv: readonly string[];
  fallback: ResolveDesktopRuntimeContextInput;
};

export const buildDesktopRuntimeForPreload = (
  input: BuildDesktopRuntimeForPreloadInput
): DesktopRuntimeContext => readDesktopRuntimeFromArgv(input.argv) ?? resolveDesktopRuntimeContext(input.fallback);
