import { toOpaqueError } from "@f1/shared";
import { runDatabaseMigration } from "./store/database-migration.js";

const start = async (): Promise<void> => {
  const applied = await runDatabaseMigration({
    connectionString: process.env.POSTGRES_URL ?? ""
  });

  console.info("DB 마이그레이션 완료", applied);
};

start().catch((error) => {
  const opaque = toOpaqueError(error);
  console.error("DB 마이그레이션 실패", opaque.publicMessage);
  process.exit(1);
});
