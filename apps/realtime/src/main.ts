import { Pool } from "pg";
import { createClient } from "redis";
import { readConfig } from "./config.js";
import { buildServer } from "./server.js";
import { PostgresRepository } from "./store/postgres-repository.js";

const start = async (): Promise<void> => {
  const config = readConfig();
  const pool = new Pool({ connectionString: config.postgresUrl });
  const redis = createClient({ url: config.redisUrl });
  await redis.connect();
  const repository = new PostgresRepository(pool, redis);

  const { app } = await buildServer({
    repository,
    internalApiToken: config.internalApiToken,
    watchTokenSecret: config.watchTokenSecret,
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
    await pool.end();
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
