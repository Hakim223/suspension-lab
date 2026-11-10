import type {
  DamageScenario,
  GlossaryTerm,
  QuizQuestion,
  SuspensionComponent,
  SuspensionId,
  SuspensionType,
  SuspensionWithComponents,
} from './types.js';
import suspensionsJson from '../content/suspensions.json' with { type: 'json' };
import componentsJson from '../content/components.json' with { type: 'json' };
import damageJson from '../content/damage-scenarios.json' with { type: 'json' };
import quizJson from '../content/quiz.json' with { type: 'json' };
import glossaryJson from '../content/glossary.json' with { type: 'json' };

export * from './types.js';

export const suspensions = suspensionsJson as unknown as SuspensionType[];
export const components = componentsJson as unknown as SuspensionComponent[];
export const damageScenarios = damageJson as unknown as DamageScenario[];
export const quiz = quizJson as unknown as QuizQuestion[];
export const glossary = glossaryJson as unknown as GlossaryTerm[];

const componentById = new Map(components.map((c) => [c.id, c]));

export function getComponent(id: string): SuspensionComponent | undefined {
  return componentById.get(id);
}

export function getSuspension(id: string): SuspensionType | undefined {
  return suspensions.find((s) => s.id === id);
}

export function resolveSuspension(s: SuspensionType): SuspensionWithComponents {
  const resolvedComponents = [...s.components]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => {
      const c = componentById.get(link.componentId);
      if (!c) throw new Error(`Unknown component ${link.componentId} in ${s.id}`);
      return { ...c, link };
    });
  return { ...s, resolvedComponents };
}

/** Damage scenarios applicable to a suspension (component must be present). */
export function scenariosForSuspension(id: SuspensionId): DamageScenario[] {
  const s = getSuspension(id);
  if (!s) return [];
  const ids = new Set(s.components.map((c) => c.componentId));
  return damageScenarios.filter((d) => ids.has(d.componentId));
}
