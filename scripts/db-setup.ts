/**
 * Applies database/schema.sql and database/seed.sql to the configured database.
 * Reads the same environment variables as the backend (backend/.env or process env).
 * Usage: npm run db:setup            (schema + seed)
 *        npm run db:setup -- --seed-only
 *        npm run db:setup -- --create-db   (CREATE DATABASE IF NOT EXISTS first; needs privileges)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, 'backend/.env') });

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

  const conn = await mysql.createConnection({
    ...base,
    ...(process.env.DATABASE_URL ? {} : { database: dbName }),
    ssl,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    if (!args.has('--seed-only')) {
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
