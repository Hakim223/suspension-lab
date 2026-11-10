import { useMemo } from 'react';
import type { DamageScenario } from '@suspension-lab/shared';
import { useLab } from '../state/labStore';
import { buildTimeline } from '../three/sim/timeline';

export const NORMAL_DAMPING_RATIO = 0.4;

/** Builds the motion timeline for the current mode and (weak-damper) damage setting. */
export function useTimeline(damageScenario: DamageScenario | null) {
  const mode = useLab((s) => s.mode);
  const damageView = useLab((s) => s.damageView);
  const intensity = useLab((s) => s.damageIntensity);
  const isWeak = !!damageScenario && damageView === 'damaged' && damageScenario.simulation.kind === 'weak-damper';
  const normal = damageScenario?.simulation.params.normalDampingRatio ?? NORMAL_DAMPING_RATIO;
  const weak = damageScenario?.simulation.params.damagedDampingRatio ?? 0.08;
  const zetaR = isWeak ? normal + (weak - normal) * intensity : NORMAL_DAMPING_RATIO;
  const zetaL = isWeak ? normal : NORMAL_DAMPING_RATIO;
  return useMemo(
    () => buildTimeline(mode === 'manual' ? 'bump' : mode, { dampingRatio: { L: zetaL, R: zetaR } }),
    [mode, zetaL, zetaR],
  );
}
