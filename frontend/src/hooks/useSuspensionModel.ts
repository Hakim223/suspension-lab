import { useEffect, useState } from 'react';
import { getModelEntry } from '../three/models/registry';
import { loadGlbSource } from '../three/rig/glbSource';
import type { SuspensionModel } from '../three/rig/types';

export type ModelStatus = 'loading' | 'ready' | 'error';

/**
 * Creates the 3D model for a suspension. Procedural geometry is available instantly; if the
 * registry lists a GLB, it is loaded lazily and swapped in when ready (falls back silently).
 */
export function useSuspensionModel(modelKey: string) {
  const [state, setState] = useState<{ key: string; model: SuspensionModel | null; status: ModelStatus; note?: string }>({
    key: modelKey,
    model: null,
    status: 'loading',
  });

  useEffect(() => {
    const entry = getModelEntry(modelKey);
    if (!entry) {
      setState({ key: modelKey, model: null, status: 'error', note: `Model '${modelKey}' tidak terdaftar` });
      return;
    }
    let cancelled = false;
    let current: SuspensionModel | null = null;
    // Defer build by a frame so the loading indicator can paint first.
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      current = entry.build();
      setState({ key: modelKey, model: current, status: 'ready' });
      if (entry.glb) {
        loadGlbSource(entry.glb)
          .then((src) => {
            if (cancelled) return;
            const glbModel = entry.build(src);
            current?.dispose();
            current = glbModel;
            setState({ key: modelKey, model: glbModel, status: 'ready', note: 'glb' });
          })
          .catch((err) => console.warn(`[model] GLB ${entry.glb} unavailable, using procedural model`, err));
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      current?.dispose();
    };
  }, [modelKey]);

  return state.key === modelKey ? state : { key: modelKey, model: null, status: 'loading' as ModelStatus };
}
