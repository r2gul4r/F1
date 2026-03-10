import { OpaqueError } from "@f1/shared";
import { Pool, PoolConfig } from "pg";

export type DatabaseConnectionInput = {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  statementTimeoutMs?: number;
};

export type DatabaseConnection = {
  pool: Pool;
  close: () => Promise<void>;
};

const asPositiveInteger = (value: number | undefined, fallback: number): number => {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return fallback;
  }
  return value;
};

const assertConnectionString = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new OpaqueError("설정값 누락");
  }
  return normalized;
};

const createPoolConfig = (input: DatabaseConnectionInput): PoolConfig => ({
  connectionString: assertConnectionString(input.connectionString),
  max: asPositiveInteger(input.maxConnections, 10),
  idleTimeoutMillis: asPositiveInteger(input.idleTimeoutMs, 10000),
  connectionTimeoutMillis: asPositiveInteger(input.connectionTimeoutMs, 10000),
  statement_timeout: asPositiveInteger(input.statementTimeoutMs, 15000)
});

export const createDatabaseConnection = (input: DatabaseConnectionInput): DatabaseConnection => {
  const pool = new Pool(createPoolConfig(input));
  return {
    pool,
    close: () => pool.end()
  };
};
