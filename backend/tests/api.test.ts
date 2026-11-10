import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ContentService } from '../src/services/contentService.js';
import { DownRepository, MemoryRepository, testEnv } from './helpers.js';

const app = createApp({ env: testEnv(), repo: new MemoryRepository() });

describe('GET /api/suspensions', () => {
  it('lists all five architectures in order', async () => {
    const res = await request(app).get('/api/suspensions').expect(200);
    expect(res.body.data.map((s: { id: string }) => s.id)).toEqual(['macpherson', 'double-wishbone', 'torsion-beam', 'multi-link', 'rigid-axle']);
  });

  it('returns a single architecture', async () => {
    const res = await request(app).get('/api/suspensions/double-wishbone').expect(200);
    expect(res.body.data.name).toBe('Double Wishbone');
    expect(res.body.data.components.length).toBeGreaterThan(5);
  });

  it('returns architecture-specific components', async () => {
    const res = await request(app).get('/api/suspensions/macpherson/components').expect(200);
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toContain('strut-mount');
    expect(ids).not.toContain('upper-control-arm');
    expect(res.body.data[0].link.roleDescription).toBeTruthy();
  });

  it('returns damage scenarios applicable to an architecture', async () => {
    const res = await request(app).get('/api/suspensions/torsion-beam/damage-scenarios').expect(200);
    const ids = res.body.data.map((d: { id: string }) => d.id);
    expect(ids).toContain('weak-shock');
    expect(ids).not.toContain('tie-rod-end-damaged');
  });

  it('404s for unknown architecture', async () => {
    const res = await request(app).get('/api/suspensions/hydropneumatic').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('components & damage scenarios', () => {
  it('returns a component with usedIn', async () => {
    const res = await request(app).get('/api/components/ball-joint').expect(200);
    expect(res.body.data.usedIn).toEqual(['macpherson', 'double-wishbone']);
    expect(res.body.data.inspection.length).toBeGreaterThan(0);
  });

  it('lists damage scenarios for a component', async () => {
    const res = await request(app).get('/api/components/shock-absorber/damage-scenarios').expect(200);
    expect(res.body.data[0].id).toBe('weak-shock');
  });

  it('returns a damage scenario', async () => {
    const res = await request(app).get('/api/damage-scenarios/tie-rod-end-damaged').expect(200);
    expect(res.body.data.simulation.kind).toBe('tie-rod-play');
  });

  it('404s for unknown component and scenario', async () => {
    await request(app).get('/api/components/flux-capacitor').expect(404);
    await request(app).get('/api/components/flux-capacitor/damage-scenarios').expect(404);
    await request(app).get('/api/damage-scenarios/nope').expect(404);
  });
});

describe('validation & errors', () => {
  it.each(['UPPER', 'bad_slug', 'a'.repeat(65), '-leading', "x'or'1"])('rejects invalid id %s with 400', async (bad) => {
    const res = await request(app).get(`/api/suspensions/${encodeURIComponent(bad)}`).expect(400);
    expect(res.body.error.code).toBe('INVALID_PARAMETER');
  });

  it('404s unknown routes with JSON', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 503 when database is unavailable', async () => {
    const down = createApp({ env: testEnv(), repo: new DownRepository() });
    const res = await request(down).get('/api/suspensions').expect(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    const health = await request(down).get('/api/health').expect(503);
    expect(health.body.db).toBe('down');
  });

  it('health reports db up', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });
});

describe('security middleware', () => {
  it('allows configured CORS origin', async () => {
    const res = await request(app).get('/api/suspensions').set('Origin', 'http://allowed.test').expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://allowed.test');
  });

  it('rejects unknown CORS origin', async () => {
    const res = await request(app).get('/api/suspensions').set('Origin', 'http://evil.test').expect(403);
    expect(res.body.error.code).toBe('CORS_FORBIDDEN');
  });

  it('sets helmet security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rate limits excessive requests', async () => {
    const limited = createApp({ env: testEnv({ RATE_LIMIT_MAX: '3' }), repo: new MemoryRepository() });
    for (let i = 0; i < 3; i++) await request(limited).get('/api/health').expect(200);
    const res = await request(limited).get('/api/health').expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('ContentService cache', () => {
  it('serves from cache within TTL and dedupes concurrent loads', async () => {
    const repo = new MemoryRepository();
    const svc = new ContentService(repo, 60_000);
    await Promise.all([svc.listSuspensions(), svc.listComponents(), svc.getSuspension('macpherson')]);
    await svc.listSuspensions();
    expect(repo.calls).toBe(1);
    svc.invalidate();
    await svc.listSuspensions();
    expect(repo.calls).toBe(2);
  });
});

describe('env validation', () => {
  it('rejects invalid port', async () => {
    const { loadEnv } = await import('../src/config/env.js');
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
