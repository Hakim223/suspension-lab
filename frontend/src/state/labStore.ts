import { create } from 'zustand';
import type { AnimationMode } from '@suspension-lab/shared';

export type DamageView = 'normal' | 'damaged';

export interface ManualControls {
  /** Travel per side in metres (+ = compression). */
  left: number;
  right: number;
  linked: boolean;
  /** Normalised steering -1..1 (+ = left turn). */
  steer: number;
}

export interface LabState {
  /** Architecture the current state belongs to (shared by Consumer & Mechanic viewers). */
  suspensionId: string | null;
  selectedComponentId: string | null;
  hoveredComponentId: string | null;
  hidden: Record<string, boolean>;
  exploded: boolean;
  showLabels: boolean;
  ghostOthers: boolean;
  mode: AnimationMode;
  playing: boolean;
  speed: number;
  manual: ManualControls;
  damageScenarioId: string | null;
  damageView: DamageView;
  damageIntensity: number;
  cameraResetToken: number;
  focusToken: number;
  /** Mobile: which sheet is open. */
  mobileSheet: 'none' | 'components' | 'info';

  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  toggleHidden: (id: string) => void;
  showAll: () => void;
  setExploded: (v: boolean) => void;
  setShowLabels: (v: boolean) => void;
  setGhostOthers: (v: boolean) => void;
  setMode: (m: AnimationMode) => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setManual: (patch: Partial<ManualControls>) => void;
  setDamageScenario: (id: string | null) => void;
  setDamageView: (v: DamageView) => void;
  setDamageIntensity: (v: number) => void;
  resetCamera: () => void;
  /** Animate the camera to the selected component (right-side instance). */
  focusSelection: () => void;
  setMobileSheet: (s: LabState['mobileSheet']) => void;
  /** Reset when entering a different architecture; keeps state when re-entering the same one. */
  resetForSuspension: (id?: string) => void;
  enterSuspension: (id: string) => boolean;
}

const initial = {
  selectedComponentId: null,
  hoveredComponentId: null,
  hidden: {},
  exploded: false,
  showLabels: typeof window === 'undefined' || typeof window.matchMedia !== 'function' ? true : !window.matchMedia('(max-width: 767px)').matches,
  ghostOthers: true,
  mode: 'bump' as AnimationMode,
  playing: false,
  speed: 1,
  manual: { left: 0, right: 0, linked: true, steer: 0 },
  damageScenarioId: null,
  damageView: 'damaged' as DamageView,
  damageIntensity: 1,
  mobileSheet: 'none' as const,
};

export const useLab = create<LabState>((set, get) => ({
  ...initial,
  suspensionId: null,
  cameraResetToken: 0,
  focusToken: 0,
  select: (id) => set({ selectedComponentId: id }),
  hover: (id) => set({ hoveredComponentId: id }),
  toggleHidden: (id) => set((s) => ({ hidden: { ...s.hidden, [id]: !s.hidden[id] } })),
  showAll: () => set({ hidden: {} }),
  setExploded: (v) => set({ exploded: v }),
  setShowLabels: (v) => set({ showLabels: v }),
  setGhostOthers: (v) => set({ ghostOthers: v }),
  setMode: (m) => set({ mode: m }),
  setPlaying: (v) => set({ playing: v }),
  setSpeed: (v) => set({ speed: Math.min(2, Math.max(0.25, v)) }),
  setManual: (patch) =>
    set((s) => {
      const m = { ...s.manual, ...patch };
      if (m.linked) {
        if (patch.left !== undefined) m.right = patch.left;
        else if (patch.right !== undefined) m.left = patch.right;
      }
      return { manual: m, mode: 'manual', playing: false };
    }),
  setDamageScenario: (id) => set({ damageScenarioId: id, damageView: 'damaged' }),
  setDamageView: (v) => set({ damageView: v }),
  setDamageIntensity: (v) => set({ damageIntensity: Math.min(1, Math.max(0, v)) }),
  resetCamera: () => set((s) => ({ cameraResetToken: s.cameraResetToken + 1 })),
  focusSelection: () => set((s) => ({ focusToken: s.focusToken + 1 })),
  setMobileSheet: (sheet) => set({ mobileSheet: sheet }),
  resetForSuspension: (id) => set({ ...initial, suspensionId: id ?? null }),
  enterSuspension: (id) => {
    if (get().suspensionId === id) return false;
    set({ ...initial, suspensionId: id });
    return true;
  },
}));
