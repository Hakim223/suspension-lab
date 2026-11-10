import { Color, Mesh, MeshStandardMaterial } from 'three';
import type { SuspensionModel } from './types';

interface Base {
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

const ACCENT = new Color('#22d3ee');
const DAMAGE = new Color('#f97316');

export interface VisualFlags {
  selected: Set<string>;
  hovered: string | null;
  hidden: Record<string, boolean>;
  ghost: boolean;
  /** Component highlighted as damaged (right side only). */
  damagedComponentId: string | null;
}

function materialsOf(m: Mesh): MeshStandardMaterial[] {
  return (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[];
}

/** Snapshot base material values once so states can be re-applied idempotently. */
export function prepareMaterials(model: SuspensionModel) {
  for (const { object } of model.parts) {
    object.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      for (const mat of materialsOf(m)) {
        if (mat.userData.base) continue;
        mat.userData.base = {
          color: mat.color?.clone() ?? new Color('#ffffff'),
          emissive: mat.emissive?.clone() ?? new Color('#000000'),
          emissiveIntensity: mat.emissiveIntensity ?? 1,
          opacity: mat.opacity,
          transparent: mat.transparent,
          depthWrite: mat.depthWrite,
        } satisfies Base;
      }
    });
  }
}

export function applyVisualState(model: SuspensionModel, f: VisualFlags) {
  const anySelected = f.selected.size > 0;
  for (const { def, object } of model.parts) {
    const id = def.componentId;
    object.visible = !(id && f.hidden[id]);
    const isSel = id !== null && f.selected.has(id);
    const isHover = id !== null && id === f.hovered;
    const isDamaged = id !== null && id === f.damagedComponentId && def.side === 'R';
    const dim = f.ghost && anySelected && !isSel;
    object.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      for (const mat of materialsOf(m)) {
        const base = mat.userData.base as Base | undefined;
        if (!base) continue;
        mat.emissive.copy(base.emissive);
        mat.emissiveIntensity = base.emissiveIntensity;
        if (isDamaged) {
          mat.emissive.copy(DAMAGE);
          mat.emissiveIntensity = 0.55;
        }
        if (isSel) {
          mat.emissive.copy(ACCENT);
          mat.emissiveIntensity = isDamaged ? 0.35 : 0.42;
        } else if (isHover) {
          mat.emissive.copy(ACCENT);
          mat.emissiveIntensity = 0.2;
        }
        const targetOpacity = dim ? Math.min(base.opacity, id === null ? 0.06 : 0.14) : base.opacity;
        const transparent = dim || base.transparent;
        if (mat.transparent !== transparent) mat.needsUpdate = true;
        mat.transparent = transparent;
        mat.opacity = targetOpacity;
        mat.depthWrite = dim ? false : base.depthWrite;
      }
      m.castShadow = !dim && id !== null;
    });
  }
}

/** Resolve the set of highlighted component ids (composites expand to their children). */
export function expandSelection(id: string | null, includes: Map<string, string[] | undefined>): Set<string> {
  const out = new Set<string>();
  if (!id) return out;
  out.add(id);
  for (const child of includes.get(id) ?? []) out.add(child);
  return out;
}
