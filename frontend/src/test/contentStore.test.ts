import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('content data source', () => {
  it('falls back to bundled local data when the API is unreachable', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.invalid');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    const { useContent } = await import('../data/contentStore');
    expect(useContent.getState().suspensions).toHaveLength(5); // available before load
    await useContent.getState().load();
    expect(useContent.getState().source).toBe('local');
    expect(useContent.getState().status).toBe('ready');
  });

  it('uses API data when the backend answers', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    const shared = await import('@suspension-lab/shared');
    const modified = shared.suspensions.map((s) => ({ ...s, tagline: `API: ${s.tagline}` }));
    const payload: Record<string, unknown> = { '/suspensions': modified, '/components': shared.components, '/damage-scenarios': shared.damageScenarios };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const path = url.replace('http://api.test/api', '');
      return new Response(JSON.stringify({ data: payload[path] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const { useContent } = await import('../data/contentStore');
    await useContent.getState().load();
    expect(useContent.getState().source).toBe('api');
    expect(useContent.getState().suspensions[0]!.tagline).toMatch(/^API: /);
  });

  it('rejects an invalid API payload and keeps local data', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })));
    const { useContent } = await import('../data/contentStore');
    await useContent.getState().load();
    expect(useContent.getState().source).toBe('local');
    expect(useContent.getState().suspensions).toHaveLength(5);
  });
});
