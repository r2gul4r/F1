import { OpaqueError } from "@f1/shared";
import { readFile } from "node:fs/promises";

type Queryable = {
  query: (text: string) => Promise<{ rows: unknown[] }>;
};

const readMigrationSql = async (migrationFileUrl: URL): Promise<string> => {
  try {
    const sql = (await readFile(migrationFileUrl, "utf8")).trim();
    if (sql.length === 0) {
      throw new OpaqueError("요청 처리 실패");
    }

    return sql;
  } catch (error) {
    if (error instanceof OpaqueError) {
      throw error;
    }

    throw new OpaqueError("요청 처리 실패");
  }
};

export const applyBaselineMigration = async (queryable: Queryable, migrationFileUrl: URL): Promise<void> => {
  const sql = await readMigrationSql(migrationFileUrl);
  await queryable.query(sql);
};
