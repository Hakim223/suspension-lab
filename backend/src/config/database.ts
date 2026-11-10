import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import type { Env } from './env.js';

export function createPool(env: Env): Pool {
  const ssl = env.DB_SSL ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED, minVersion: 'TLSv1.2' } : undefined;
  const common: Partial<PoolOptions> = {
    waitForConnections: true,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    ssl,
  };
  if (env.DATABASE_URL) {
    return mysql.createPool({ uri: env.DATABASE_URL, ...common });
  }
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ...common,
  });
}
