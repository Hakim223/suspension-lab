/**
 * Integration tests against a real MySQL server.
 * Enabled when TEST_DB_HOST (or TEST_DATABASE_URL) is set; otherwise skipped with a notice.
 * Creates/overwrites the database named TEST_DB_NAME (default: suspension_lab_test).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { components, damageScenarios, suspensions } from '@suspension-lab/shared';
import { createApp } from '../src/app.js';
import { MySqlContentRepository } from '../src/services/mysqlRepository.js';
import { testEnv } from './helpers.js';

const host = process.env.TEST_DB_HOST;
const enabled = Boolean(host);
const dbName = process.env.TEST_DB_NAME ?? 'suspension_lab_test';
const root = resolve(import.meta.dirname, '../..');

describe.skipIf(!enabled)('MySQL integration', () => {
  let pool: mysql.Pool;

  beforeAll(async () => {
    const conn = await mysql.createConnection({
      host, port: Number(process.env.TEST_DB_PORT ?? 3306), user: process.env.TEST_DB_USER ?? 'root',
      password: process.env.TEST_DB_PASSWORD ?? '', multipleStatements: true,
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\`; CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE \`${dbName}\`;`);
    await conn.query(readFileSync(resolve(root, 'database/schema.sql'), 'utf8'));
    await conn.query(readFileSync(resolve(root, 'database/seed.sql'), 'utf8'));
    await conn.end();
    pool = mysql.createPool({
      host, port: Number(process.env.TEST_DB_PORT ?? 3306), user: process.env.TEST_DB_USER ?? 'root',
      password: process.env.TEST_DB_PASSWORD ?? '', database: dbName, charset: 'utf8mb4',
    });
  });

  afterAll(async () => { await pool?.end(); });

  it('round-trips suspensions exactly as the source content', async () => {
    const repo = new MySqlContentRepository(pool);
    expect(await repo.listSuspensions()).toEqual(suspensions);
  });

  it('round-trips components (incl. education rows and includes)', async () => {
    const repo = new MySqlContentRepository(pool);
    expect(await repo.listComponents()).toEqual(components);
  });

  it('round-trips damage scenarios', async () => {
    const repo = new MySqlContentRepository(pool);
    expect(await repo.listDamageScenarios()).toEqual(damageScenarios);
  });

  it('enforces foreign keys', async () => {
    await expect(pool.query('INSERT INTO suspension_components (suspension_type_id, component_id, role_description) VALUES (999, 1, "x")')).rejects.toThrow(/foreign key/i);
  });

  it('enforces unique architecture/component pairs', async () => {
    await expect(pool.query('INSERT INTO suspension_components (suspension_type_id, component_id, role_description) VALUES (1, 1, "dup")')).rejects.toThrow(/Duplicate/i);
  });

  it('serves the API end-to-end from MySQL', async () => {
    const app = createApp({ env: testEnv(), repo: new MySqlContentRepository(pool) });
    const res = await request(app).get('/api/suspensions/rigid-axle/components').expect(200);
    expect(res.body.data.map((c: { id: string }) => c.id)).toContain('panhard-rod');
    const h = await request(app).get('/api/health').expect(200);
    expect(h.body.db).toBe('up');
    const comp = await request(app).get('/api/components/strut-assembly').expect(200);
    expect(comp.body.data.includes).toEqual(['shock-absorber', 'coil-spring', 'strut-mount']);
  });
});

if (!enabled) console.warn('[db.integration] skipped: set TEST_DB_HOST (and TEST_DB_USER/TEST_DB_PASSWORD) to run');
