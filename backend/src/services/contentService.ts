import type {
  DamageScenario,
  SuspensionComponent,
  SuspensionComponentLink,
  SuspensionType,
} from '@suspension-lab/shared/types';
import type { ContentRepository } from './repository.js';

interface Snapshot {
  suspensions: SuspensionType[];
  components: SuspensionComponent[];
  damage: DamageScenario[];
  loadedAt: number;
}

/**
 * Content service with a short in-memory cache. Educational content changes rarely,
 * so caching keeps DB load near zero for kiosk traffic while staying fresh within `ttlMs`.
 */
export class ContentService {
  private cache: Snapshot | null = null;
  private inflight: Promise<Snapshot> | null = null;

  constructor(
    private readonly repo: ContentRepository,
    private readonly ttlMs = 60_000,
  ) {}

  private async snapshot(): Promise<Snapshot> {
    if (this.cache && Date.now() - this.cache.loadedAt < this.ttlMs) return this.cache;
    if (!this.inflight) {
      this.inflight = (async () => {
        const [suspensions, components, damage] = await Promise.all([
          this.repo.listSuspensions(),
          this.repo.listComponents(),
          this.repo.listDamageScenarios(),
        ]);
        this.cache = { suspensions, components, damage, loadedAt: Date.now() };
        return this.cache;
      })().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  invalidate() {
    this.cache = null;
  }

  async listSuspensions() {
    return (await this.snapshot()).suspensions;
  }

  async getSuspension(id: string) {
    return (await this.snapshot()).suspensions.find((s) => s.id === id) ?? null;
  }

  async getSuspensionComponents(id: string): Promise<Array<SuspensionComponent & { link: SuspensionComponentLink }> | null> {
    const snap = await this.snapshot();
    const s = snap.suspensions.find((x) => x.id === id);
    if (!s) return null;
    return [...s.components]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((link) => {
        const c = snap.components.find((x) => x.id === link.componentId);
        return c ? [{ ...c, link }] : [];
      });
  }

  async getSuspensionDamageScenarios(id: string) {
    const snap = await this.snapshot();
    const s = snap.suspensions.find((x) => x.id === id);
    if (!s) return null;
    const ids = new Set(s.components.map((c) => c.componentId));
    return snap.damage.filter((d) => ids.has(d.componentId));
  }

  async listComponents() {
    return (await this.snapshot()).components;
  }

  async getComponent(id: string) {
    const snap = await this.snapshot();
    const c = snap.components.find((x) => x.id === id);
    if (!c) return null;
    const usedIn = snap.suspensions.filter((s) => s.components.some((l) => l.componentId === id)).map((s) => s.id);
    return { ...c, usedIn };
  }

  async getComponentDamageScenarios(id: string) {
    const snap = await this.snapshot();
    if (!snap.components.some((c) => c.id === id)) return null;
    return snap.damage.filter((d) => d.componentId === id);
  }

  async listDamageScenarios() {
    return (await this.snapshot()).damage;
  }

  async getDamageScenario(id: string) {
    return (await this.snapshot()).damage.find((d) => d.id === id) ?? null;
  }
}
