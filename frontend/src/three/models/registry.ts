import type { PartSource } from '../rig/builder';
import type { SuspensionModel } from '../rig/types';
import { buildMacPherson } from './macpherson';
import { buildDoubleWishbone } from './doubleWishbone';
import { buildMultiLink } from './multiLink';
import { buildTorsionBeam } from './torsionBeam';
import { buildRigidAxle } from './rigidAxle';

export type ModelFactory = (source?: PartSource) => SuspensionModel;

export interface ModelEntry {
  key: string;
  build: ModelFactory;
  /**
   * Optional GLB asset (relative to VITE_MODEL_BASE_URL or /models). When present and it loads,
   * its named nodes replace the procedural parts with the same name; missing nodes fall back
   * to procedural geometry. See docs/asset-pipeline.md for the naming & pivot conventions.
   */
  glb?: string;
  /** Camera framing for this model. */
  camera: { position: [number, number, number]; target: [number, number, number] };
}

export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  macpherson: {
    key: 'macpherson',
    build: buildMacPherson,
    camera: { position: [1.55, 1.15, 1.95], target: [0.25, 0.42, 0] },
  },
  'double-wishbone': {
    key: 'double-wishbone',
    build: buildDoubleWishbone,
    camera: { position: [1.55, 1.05, 1.95], target: [0.25, 0.38, 0] },
  },
  'torsion-beam': {
    key: 'torsion-beam',
    build: buildTorsionBeam,
    camera: { position: [1.65, 1.2, -1.85], target: [0.15, 0.32, 0.15] },
  },
  'multi-link': {
    key: 'multi-link',
    build: buildMultiLink,
    camera: { position: [1.6, 1.15, -1.9], target: [0.25, 0.36, 0.05] },
  },
  'rigid-axle': {
    key: 'rigid-axle',
    build: buildRigidAxle,
    camera: { position: [1.65, 1.2, -1.95], target: [0.1, 0.36, 0.05] },
  },
};

export function getModelEntry(key: string): ModelEntry | undefined {
  return MODEL_REGISTRY[key];
}
