import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SteeringSystemId } from '../data/types';

export type AnatomyView = 'assembled' | 'exploded' | 'cutaway';

interface MechanicState {
  /** Workbench selection (per architecture session). */
  componentId: string | null;
  subcomponentId: string | null;
  failureId: string | null;
  simActive: boolean;
  /** Steering module. */
  steeringSystem: SteeringSystemId;
  steeringPartId: string | null;
  steeringFailureId: string | null;
  epsVariant: number;
  /** Anatomy module. */
  anatomyId: string;
  anatomyView: AnatomyView;
  anatomyFailureId: string | null;
  anatomyPartId: string | null;
  /** Diagnostics. */
  caseId: string | null;

  selectComponent: (id: string | null) => void;
  selectSubcomponent: (id: string | null) => void;
  selectFailure: (id: string | null) => void;
  setSimActive: (v: boolean) => void;
  setSteering: (patch: Partial<Pick<MechanicState, 'steeringSystem' | 'steeringPartId' | 'steeringFailureId' | 'epsVariant'>>) => void;
  setAnatomy: (patch: Partial<Pick<MechanicState, 'anatomyId' | 'anatomyView' | 'anatomyFailureId' | 'anatomyPartId'>>) => void;
  setCase: (id: string | null) => void;
  resetSimulation: () => void;
}

export const useMechanic = create<MechanicState>()(
  persist(
    (set) => ({
      componentId: null,
      subcomponentId: null,
      failureId: null,
      simActive: false,
      steeringSystem: 'mechanical',
      steeringPartId: null,
      steeringFailureId: null,
      epsVariant: 0,
      anatomyId: 'shock-absorber',
      anatomyView: 'cutaway',
      anatomyFailureId: null,
      anatomyPartId: null,
      caseId: null,
      selectComponent: (id) => set({ componentId: id, subcomponentId: null, failureId: null, simActive: false }),
      selectSubcomponent: (id) => set({ subcomponentId: id }),
      selectFailure: (id) => set({ failureId: id, simActive: id !== null }),
      setSimActive: (v) => set({ simActive: v }),
      setSteering: (patch) => set(patch),
      setAnatomy: (patch) => set(patch),
      setCase: (id) => set({ caseId: id }),
      resetSimulation: () => set({ failureId: null, simActive: false }),
    }),
    {
      name: 'sl-mechanic',
      // Throws when storage is blocked; zustand then runs without persistence.
      storage: createJSONStorage(() => window.sessionStorage),
    },
  ),
);
