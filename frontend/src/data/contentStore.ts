import { create } from 'zustand';
import {
  components as localComponents,
  damageScenarios as localDamage,
  suspensions as localSuspensions,
  type DamageScenario,
  type SuspensionComponent,
  type SuspensionType,
} from '@suspension-lab/shared';
import { apiGet } from './api';

export type DataSource = 'local' | 'api';

interface ContentState {
  source: DataSource;
  status: 'idle' | 'loading' | 'ready';
  suspensions: SuspensionType[];
  components: SuspensionComponent[];
  damageScenarios: DamageScenario[];
  load: () => Promise<void>;
}

function looksValid(s: unknown[], c: unknown[], d: unknown[]) {
  return Array.isArray(s) && s.length > 0 && Array.isArray(c) && c.length > 0 && Array.isArray(d);
}

/**
 * Content is available immediately from the bundled JSON (works offline / without backend).
 * On load() we try the REST API; if it answers with valid data it replaces the local copy.
 */
export const useContent = create<ContentState>((set, get) => ({
  source: 'local',
  status: 'idle',
  suspensions: localSuspensions,
  components: localComponents,
  damageScenarios: localDamage,
  async load() {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const [s, c, d] = await Promise.all([
        apiGet<SuspensionType[]>('/suspensions'),
        apiGet<SuspensionComponent[]>('/components'),
        apiGet<DamageScenario[]>('/damage-scenarios'),
      ]);
      if (!looksValid(s, c, d)) throw new Error('invalid payload');
      set({ suspensions: s, components: c, damageScenarios: d, source: 'api', status: 'ready' });
    } catch {
      set({ source: 'local', status: 'ready' });
    }
  },
}));

export function selectSuspension(state: ContentState, id: string | undefined) {
  return state.suspensions.find((s) => s.id === id);
}
