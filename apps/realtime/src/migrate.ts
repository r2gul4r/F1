import { pathToFileURL } from "node:url";
import { logRealtimeMigrationFailure } from "./failure-logging.js";
import { runDatabaseMigration } from "./store/database-migration.js";

type RunMigrationCliOptions = {
  connectionString?: string;
  exit?: (code: number) => void;
};

export const runMigrationCli = async (options: RunMigrationCliOptions = {}): Promise<void> => {
  try {
    const applied = await runDatabaseMigration({
      connectionString: options.connectionString ?? process.env.POSTGRES_URL ?? ""
    });

    console.info("DB 마이그레이션 완료", applied);
  } catch (error) {
    logRealtimeMigrationFailure(error);
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
  void runMigrationCli();
}
