import { type BackoffOutcome } from "./backoff-policy.js";
import { decideBackoffOutcome } from "./backoff-outcome.js";
import { type RealtimeClient } from "./realtime-client.js";
import { type Snapshot, type TelemetrySource } from "./sources/types.js";

type MainLoopClient = Pick<RealtimeClient, "syncSession" | "sendTelemetry" | "sendFlag" | "handleFailure">;

export type MainLoopCycleInput = {
  source: TelemetrySource;
  mockSource: TelemetrySource;
  client: MainLoopClient;
  allowMockFallback: boolean;
};

const publishSnapshot = async (client: MainLoopClient, snapshot: Snapshot): Promise<void> => {
  await client.syncSession(snapshot.session, snapshot.drivers);
  await Promise.all(snapshot.ticks.map((tick) => client.sendTelemetry(tick)));

  if (snapshot.flag) {
    await client.sendFlag(snapshot.flag);
  }
};

export const runMainLoopCycle = async ({
  source,
  mockSource,
  client,
  allowMockFallback
}: MainLoopCycleInput): Promise<BackoffOutcome> => {
  let primarySourceSucceeded = false;
  let fallbackSourceSucceeded = false;

  try {
    const snapshot = await source.pull();
    await publishSnapshot(client, snapshot);
    primarySourceSucceeded = true;
  } catch (error) {
    if (!allowMockFallback) {
      client.handleFailure(error);
    } else {
      try {
        const fallbackSnapshot = await mockSource.pull();
        await publishSnapshot(client, fallbackSnapshot);
        fallbackSourceSucceeded = true;
      } catch (fallbackError) {
        client.handleFailure(fallbackError);
      }
    }
  }

  return decideBackoffOutcome({
    primarySourceSucceeded,
    fallbackSourceSucceeded
  });
};
