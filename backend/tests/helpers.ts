import { components, damageScenarios, suspensions } from '@suspension-lab/shared';
import { loadEnv } from '../src/config/env.js';
import type { ContentRepository } from '../src/services/repository.js';

export const testEnv = (over: Record<string, string> = {}) =>
  loadEnv({ NODE_ENV: 'test', CORS_ORIGINS: 'http://allowed.test', RATE_LIMIT_MAX: '1000', ...over });

export class MemoryRepository implements ContentRepository {
  calls = 0;
  async listSuspensions() { this.calls++; return structuredClone(suspensions); }
  async listComponents() { return structuredClone(components); }
  async listDamageScenarios() { return structuredClone(damageScenarios); }
  async ping() { return true; }
}

export class DownRepository implements ContentRepository {
  private fail(): never { throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }); }
  async listSuspensions(): Promise<never> { this.fail(); }
  async listComponents(): Promise<never> { this.fail(); }
  async listDamageScenarios(): Promise<never> { this.fail(); }
  async ping() { return false; }
}
