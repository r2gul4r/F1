import { readConfig } from "./config.js";
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
    ? new OpenF1Source(config.openF1BaseUrl, config.openF1ApiKey!)
    : mockSource;

  while (true) {
    try {
      const snapshot = await source.pull();
      await client.syncSession(snapshot.session, snapshot.drivers);

      const tasks = snapshot.ticks.map((tick) => client.sendTelemetry(tick));
      await Promise.all(tasks);

      if (snapshot.flag) {
        await client.sendFlag(snapshot.flag);
      }
    } catch (error) {
      if (config.dataSource === "openf1") {
        try {
          const fallback = await mockSource.pull();
          await client.syncSession(fallback.session, fallback.drivers);
          await Promise.all(fallback.ticks.map((tick) => client.sendTelemetry(tick)));
          if (fallback.flag) {
            await client.sendFlag(fallback.flag);
          }
        } catch (fallbackError) {
          client.handleFailure(fallbackError);
        }
      } else {
        client.handleFailure(error);
      }
    }

    await wait(config.pollMs);
  }
};

start().catch((error) => {
  // 한국어 로그 메시지 유지
  console.error("워커 시작 실패", error);
  process.exit(1);
});
