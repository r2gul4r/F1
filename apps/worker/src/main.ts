import { pathToFileURL } from "node:url";
import { getNextPollDelayMs, nextBackoffState, type BackoffOutcome } from "./backoff-policy.js";
import { readConfig } from "./config.js";
import { logWorkerStartupFailure } from "./failure-logging.js";
import { runMainLoopCycle } from "./main-loop-cycle.js";
import { RealtimeClient } from "./realtime-client.js";
import { MockSource } from "./sources/mock-source.js";
import { OpenF1Source } from "./sources/openf1-source.js";
import { TelemetrySource } from "./sources/types.js";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type RunWorkerCliOptions = {
  exit?: (code: number) => void;
};

export const startWorkerLoop = async (): Promise<void> => {
  const config = readConfig();
  const client = new RealtimeClient(
    config.realtimeBaseUrl,
    config.internalApiToken,
    config.realtimePostTimeoutMs
  );
  const mockSource = new MockSource();

  const source: TelemetrySource = config.dataSource === "openf1"
    ? new OpenF1Source(config.openF1BaseUrl, config.openF1ApiKey!, config.openF1RequestTimeoutMs)
    : mockSource;
  const backoffPolicy = {
    baseMs: config.pollMs,
    maxMs: config.retryBackoffMaxMs,
    multiplier: config.retryBackoffMultiplier
  };
  let backoffState = { consecutiveFailures: 0 };

  while (true) {
    const backoffOutcome: BackoffOutcome = await runMainLoopCycle({
      source,
      mockSource,
      client,
      allowMockFallback: config.dataSource === "openf1"
    });
    backoffState = nextBackoffState(backoffState, backoffOutcome);
    await wait(getNextPollDelayMs(backoffPolicy, backoffState));
  }
};

export const runWorkerCli = async (options: RunWorkerCliOptions = {}): Promise<void> => {
  try {
    await startWorkerLoop();
  } catch (error) {
    logWorkerStartupFailure(error);
    (options.exit ?? process.exit)(1);
  }
};

const isDirectRun = (): boolean => {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  return import.meta.url === pathToFileURL(entryPath).href;
};

if (isDirectRun()) {
  void runWorkerCli();
}
