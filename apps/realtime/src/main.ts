import { createClient } from "redis";
import { readConfig } from "./config.js";
import { buildServer } from "./server.js";
import { createDatabaseConnection } from "./store/database-connection.js";
import { OAuthUserRepository } from "./store/oauth-user-repository.js";
import { PostgresRepository } from "./store/postgres-repository.js";

const start = async (): Promise<void> => {
  const config = readConfig();
  const databaseConnection = createDatabaseConnection({
    connectionString: config.postgresUrl
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
    ollamaBaseUrl: config.ollamaBaseUrl,
    ollamaModel: config.ollamaModel
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

start().catch((error) => {
  // 한국어 로그 메시지 유지
  console.error("서버 시작 실패", error);
  process.exit(1);
});
