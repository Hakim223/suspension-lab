import { useMemo } from 'react';
import type { DamageScenario, SuspensionComponent, SuspensionComponentLink, SuspensionType } from '@suspension-lab/shared';
import { useContent } from '../data/contentStore';

export type ResolvedComponent = SuspensionComponent & { link: SuspensionComponentLink; displayName: string };

export interface SuspensionView {
  suspension: SuspensionType;
  components: ResolvedComponent[];
  componentById: Map<string, ResolvedComponent>;
  damageScenarios: DamageScenario[];
}

/** Resolves a suspension and its architecture-specific components + applicable damage scenarios. */
export function useSuspension(id: string | undefined): SuspensionView | null {
  const suspensions = useContent((s) => s.suspensions);
  const components = useContent((s) => s.components);
  const damage = useContent((s) => s.damageScenarios);
  return useMemo(() => {
    const suspension = suspensions.find((s) => s.id === id);
    if (!suspension) return null;
    const byId = new Map(components.map((c) => [c.id, c]));
    const resolved: ResolvedComponent[] = [...suspension.components]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((link) => {
        const c = byId.get(link.componentId);
        return c ? [{ ...c, link, displayName: link.localName ?? c.name }] : [];
      });
    const ids = new Set(resolved.map((c) => c.id));
    return {
      suspension,
      components: resolved,
      componentById: new Map(resolved.map((c) => [c.id, c])),
      damageScenarios: damage.filter((d) => ids.has(d.componentId)).sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }, [suspensions, components, damage, id]);
}
