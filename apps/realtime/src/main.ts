import { createClient } from "redis";
import { pathToFileURL } from "node:url";
import { readConfig } from "./config.js";
import { logRealtimeStartupFailure } from "./failure-logging.js";
import { buildServer } from "./server.js";
import { createDatabaseConnection } from "./store/database-connection.js";
import { runDatabaseMigrations } from "./store/migration-runner.js";
import { OAuthUserRepository } from "./store/oauth-user-repository.js";
import { PostgresRepository } from "./store/postgres-repository.js";

type RunRealtimeServerCliOptions = {
  exit?: (code: number) => void;
};

export const startRealtimeServer = async (): Promise<void> => {
  const config = readConfig();
  const databaseConnection = createDatabaseConnection({
    connectionString: config.postgresUrl
  });
  await runDatabaseMigrations({
    pool: databaseConnection.pool
  });
  const redis = createClient({ url: config.redisUrl });
  await redis.connect();
  const repository = new PostgresRepository(databaseConnection.pool, redis);
  const oauthUserRepository = new OAuthUserRepository(databaseConnection.pool);

  const { app } = await buildServer({
    repository,
    oauthUserRepository,
    internalApiToken: config.internalApiToken,
    oauthProxyToken: config.oauthProxyToken,
    watchTokenSecret: config.watchTokenSecret,
    watchTokenTtlSec: config.watchTokenTtlSec,
    allowedOrigins: config.allowedOrigins,
    wsBufferSize: config.wsBufferSize,
    aiRequestTimeoutMs: config.aiRequestTimeoutMs,
    aiProvider: config.aiProvider,
    ollamaBaseUrl: config.ollamaBaseUrl,
    ollamaModel: config.ollamaModel,
    geminiApiKey: config.geminiApiKey,
    geminiModel: config.geminiModel
  });

  await app.listen({
    port: config.port,
    host: "0.0.0.0"
  });
  app.log.info({ port: config.port }, "realtime server started");

  const shutdown = async (): Promise<void> => {
    await app.close();
    await redis.disconnect();
    await databaseConnection.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

export const runRealtimeServerCli = async (options: RunRealtimeServerCliOptions = {}): Promise<void> => {
  try {
    await startRealtimeServer();
  } catch (error) {
    logRealtimeStartupFailure(error);
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
  void runRealtimeServerCli();
}
