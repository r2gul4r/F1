import {
  createDatabaseConnection,
  DatabaseConnection,
  DatabaseConnectionInput
} from "./database-connection.js";
import { runDatabaseMigrations } from "./migration-runner.js";

type DatabaseConnectionFactory = (input: DatabaseConnectionInput) => DatabaseConnection;

export type DatabaseMigrationInput = {
  connectionString: string;
  migrationsDir?: string;
  connectionFactory?: DatabaseConnectionFactory;
};

export const runDatabaseMigration = async (input: DatabaseMigrationInput): Promise<string[]> => {
  const createConnection = input.connectionFactory ?? createDatabaseConnection;
  const connection = createConnection({
    connectionString: input.connectionString
  });

  try {
    return await runDatabaseMigrations({
      pool: connection.pool,
      migrationsDir: input.migrationsDir
    });
  } finally {
    await connection.close();
  }
};
