import {
  components,
  damageScenarios,
  suspensions,
  type DamageScenario,
  type SuspensionComponent,
  type SuspensionType,
} from '@suspension-lab/shared';

/**
 * All educational content is bundled into the static site at build time
 * (from shared/content/*.json). There is no backend or database.
 */
export interface Content {
  suspensions: SuspensionType[];
  components: SuspensionComponent[];
  damageScenarios: DamageScenario[];
}

const CONTENT: Content = { suspensions, components, damageScenarios };

/** Selector hook kept for a stable call-site shape: `useContent((c) => c.suspensions)`. */
export function useContent<T>(select: (c: Content) => T): T {
  return select(CONTENT);
}
