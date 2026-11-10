import type {
  ComponentCategory,
  DamageScenario,
  DamageSimKind,
  SuspensionComponent,
  SuspensionId,
  SuspensionType,
} from '@suspension-lab/shared/types';

/** Data access abstraction — MySQL in production, in-memory in unit tests. */
export interface ContentRepository {
  listSuspensions(): Promise<SuspensionType[]>;
  listComponents(): Promise<SuspensionComponent[]>;
  listDamageScenarios(): Promise<DamageScenario[]>;
  ping(): Promise<boolean>;
}

export type { ComponentCategory, DamageSimKind, SuspensionId };
