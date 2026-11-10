import type { Group, Object3D } from 'three';
import type { DamageSimKind } from '@suspension-lab/shared';

export type Side = 'L' | 'R';

/** Damage visual parameters active for this frame (applied to the RIGHT side only; left = reference). */
export interface DamageInput {
  kind: DamageSimKind;
  params: Record<string, number>;
  /** 0..1 user-controlled severity multiplier. */
  intensity: number;
}

/** Everything a rig needs to pose itself for one frame. Units: metres, radians, seconds. */
export interface RigFrame {
  /** Wheel travel relative to design ride height, + = compression (bump), per side. */
  travel: Record<Side, number>;
  /** d(travel)/dt per side (m/s) — used for damage "knock" effects. */
  vel: Record<Side, number>;
  /** Normalised steering rack position, -1 (full right) .. +1 (full left). */
  rack: number;
  rackVel: number;
  time: number;
  /** Accumulated wheel spin angle (rad) for rolling visuals. */
  wheelAngle: number;
  /** 0 = assembled, 1 = fully exploded. */
  explode: number;
  damage: DamageInput | null;
}

export interface PartDef {
  /** GLB node name convention, e.g. "R_Lower_Arm" or "C_Stabilizer_Bar". */
  name: string;
  /** Component id from content, or null for non-selectable context geometry. */
  componentId: string | null;
  side: Side | 'C';
  /** Exploded-view offset in the part's corner-local frame (metres). */
  explode?: [number, number, number];
}

export interface ModelPart {
  def: PartDef;
  object: Object3D;
}

export interface KinematicReport {
  /** Name -> current length; used by tests to verify rigid-link constraints. */
  links: Record<string, number>;
  angles: Record<string, number>;
}

export interface SuspensionModel {
  key: string;
  root: Group;
  parts: ModelPart[];
  /** Apply a frame (pose all parts). */
  update(frame: RigFrame): void;
  /** Last kinematic report (link lengths, angles) for debugging/tests. */
  report(): KinematicReport;
  dispose(): void;
  source: 'procedural' | 'glb';
  /** GLB node names that were expected but missing (procedural fallback used). */
  missingNodes: string[];
}
