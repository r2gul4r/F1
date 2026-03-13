import { getNextPollDelayMs, nextBackoffState, type BackoffOutcome } from "./backoff-policy.js";
import { readConfig } from "./config.js";
import { runMainLoopCycle } from "./main-loop-cycle.js";
import { RealtimeClient } from "./realtime-client.js";
import { MockSource } from "./sources/mock-source.js";
import { OpenF1Source } from "./sources/openf1-source.js";
import { TelemetrySource } from "./sources/types.js";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const start = async (): Promise<void> => {
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

start().catch((error) => {
  // 한국어 로그 메시지 유지
  console.error("워커 시작 실패", error);
  process.exit(1);
});
