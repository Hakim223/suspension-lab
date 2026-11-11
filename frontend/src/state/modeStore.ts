import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppMode = 'consumer' | 'mechanic';

interface ModeState {
  lastMode: AppMode | null;
  lastPath: Record<AppMode, string>;
  remember: (mode: AppMode, path: string) => void;
}

/** Remembers where the user was in each mode so switching modes returns them there. */
export const useMode = create<ModeState>()(
  persist(
    (set) => ({
      lastMode: null,
      lastPath: { consumer: '/consumer', mechanic: '/mechanic' },
      remember: (mode, path) => set((s) => ({ lastMode: mode, lastPath: { ...s.lastPath, [mode]: path } })),
    }),
    { name: 'sl-mode', storage: createJSONStorage(() => safeStorage()) },
  ),
);

function safeStorage(): Storage {
  try {
    const k = '__sl_test__';
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      get length() { return mem.size; },
      clear: () => mem.clear(),
      getItem: (k) => mem.get(k) ?? null,
      key: (i) => [...mem.keys()][i] ?? null,
      removeItem: (k) => void mem.delete(k),
      setItem: (k, v) => void mem.set(k, v),
    };
  }
}

const CONSUMER_PREFIXES = ['/consumer', '/jelajah', '/belajar', '/kuis'];

export function modeOfPath(path: string): AppMode | null {
  if (path.startsWith('/mechanic')) return 'mechanic';
  if (CONSUMER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'consumer';
  return null;
}

/** Target path when switching to `target` from `currentPath` (keeps the architecture when possible). */
export function switchTarget(target: AppMode, currentPath: string, lastPath: Record<AppMode, string>): string {
  const consumerArch = /^\/jelajah\/([a-z-]+)/.exec(currentPath)?.[1];
  const mechArch = /^\/mechanic\/arsitektur\/([a-z-]+)/.exec(currentPath)?.[1];
  if (target === 'mechanic' && consumerArch) return `/mechanic/arsitektur/${consumerArch}`;
  if (target === 'consumer' && mechArch) return `/jelajah/${mechArch}`;
  return lastPath[target];
}
