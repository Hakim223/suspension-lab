/**
 * Applies database/schema.sql and database/seed.sql.
 * Runs locally (`npm run db:setup`) and on Railway as the pre-deploy command
 * (`node backend/dist/scripts/dbSetup.js --ensure-schema`).
 *
 *   (no flag)        drop & recreate tables, then seed
 *   --ensure-schema  create tables only if they do not exist yet, then seed (safe on every deploy)
 *   --seed-only      only refresh content (single transaction)
 *   --create-db      CREATE DATABASE IF NOT EXISTS first (discrete DB_* vars only)
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: resolve(root, 'backend/.env'), quiet: true });

const args = new Set(process.argv.slice(2));
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;

async function main() {
  const dbName = process.env.DB_NAME ?? 'suspension_lab';
  const base = process.env.DATABASE_URL
    ? { uri: process.env.DATABASE_URL }
    : { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '' };

  if (args.has('--create-db') && !process.env.DATABASE_URL) {
    const c = await mysql.createConnection({ ...base, ssl, multipleStatements: true });
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await c.end();
    console.log(`Database ${dbName} ensured.`);
  }

  let conn: mysql.Connection | null = null;
  for (let attempt = 1; ; attempt++) {
    try {
      conn = await mysql.createConnection({ ...base, ...(process.env.DATABASE_URL ? {} : { database: dbName }), ssl, multipleStatements: true, charset: 'utf8mb4', connectTimeout: 10_000 });
      break;
    } catch (err) {
      // The database may still be starting right after provisioning.
      if (attempt >= 10) throw err;
      console.log(`DB not reachable yet (${(err as Error).message}); retrying in 5 s…`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  try {
    let applySchema = !args.has('--seed-only');
    if (args.has('--ensure-schema')) {
      const [rows] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'suspension_types'");
      applySchema = (rows as Array<{ n: number }>)[0]!.n === 0;
      console.log(applySchema ? 'Tables missing — creating schema.' : 'Schema present — keeping tables.');
    }
    if (applySchema) {
      await conn.query(readFileSync(resolve(root, 'database/schema.sql'), 'utf8'));
      console.log('Schema applied.');
    }
    await conn.query(readFileSync(resolve(root, 'database/seed.sql'), 'utf8'));
    const [rows] = await conn.query('SELECT (SELECT COUNT(*) FROM suspension_types) s, (SELECT COUNT(*) FROM components) c, (SELECT COUNT(*) FROM damage_scenarios) d');
    console.log('Seed applied:', rows);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('db-setup failed:', err.message);
  process.exit(1);
});
