import { loadEnv } from './config/env.js';
import { createPool } from './config/database.js';
import { MySqlContentRepository } from './services/mysqlRepository.js';
import { createApp } from './app.js';

const env = loadEnv();
const pool = createPool(env);
const repo = new MySqlContentRepository(pool);
const app = createApp({ env, repo });

const server = app.listen(env.PORT, async () => {
  const db = await repo.ping();
  console.log(`Suspension Lab API listening on :${env.PORT} (${env.NODE_ENV}) — database ${db ? 'connected' : 'UNREACHABLE'}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down…`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
