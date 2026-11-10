import { Group, Mesh, Object3D, Vector3, type Material } from 'three';
import type { KinematicReport, ModelPart, PartDef, RigFrame, Side, SuspensionModel } from './types';
import { placeBetween, SpringGeometry } from './parts';
import { mergeStaticMeshes } from './optimize';

/**
 * Source of part objects. The procedural source always uses the factory;
 * a GLB source returns a clone of the named node when the GLB provides it.
 */
export interface PartSource {
  kind: 'procedural' | 'glb';
  /** Returns an object for `name` (e.g. "R_Lower_Arm"), or null to use the procedural factory. */
  lookup(name: string): Object3D | null;
}

export const proceduralSource: PartSource = { kind: 'procedural', lookup: () => null };

type Driver = (frame: RigFrame) => KinematicReport;

/**
 * Builds a SuspensionModel:
 *  - root
 *    ├── corner_R  (right-hand corner, authored in +X)
 *    ├── corner_L  (same parts, mirrored with scale.x = -1)
 *    └── center    (parts spanning both sides: stabilizer bar, rack, beam, axle…)
 * All parts get `name`, `userData.componentId`, `userData.partName` for picking.
 */
export class ModelBuilder {
  readonly root = new Group();
  readonly corner: Record<Side, Group> = { L: new Group(), R: new Group() };
  readonly center = new Group();
  readonly parts: ModelPart[] = [];
  private readonly byName = new Map<string, Object3D>();
  private readonly base = new Map<Object3D, { p: Vector3; q: [number, number, number, number]; s: Vector3 }>();
  missingFromGlb: string[] = [];

  constructor(readonly key: string, readonly source: PartSource = proceduralSource) {
    this.root.name = `${toPascal(key)}_Assembly`;
    this.corner.R.name = 'Corner_R';
    this.corner.L.name = 'Corner_L';
    this.corner.L.scale.x = -1; // mirror: left corner is the right corner reflected across X = 0
    this.center.name = 'Center';
    this.root.add(this.corner.R, this.corner.L, this.center);
  }

  /** Register a part. `factory` builds the procedural object if the source does not provide one. */
  add<T extends Object3D>(def: PartDef, factory: () => T): Object3D {
    let obj: Object3D | null = null;
    if (this.source.kind === 'glb') {
      // Artists author only R_ and C_ nodes; L_ parts are clones of the R_ node in the mirrored corner.
      const lookupName = def.side === 'L' ? def.name.replace(/^L_/, 'R_') : def.name;
      obj = this.source.lookup(lookupName);
      if (!obj) this.missingFromGlb.push(lookupName);
    }
    if (!obj) {
      obj = factory();
      mergeStaticMeshes(obj);
    }
    obj.name = def.name;
    obj.userData.partName = def.name;
    obj.userData.componentId = def.componentId;
    obj.userData.side = def.side;
    const parent = def.side === 'C' ? this.center : this.corner[def.side];
    parent.add(obj);
    this.parts.push({ def, object: obj });
    this.byName.set(def.name, obj);
    return obj;
  }

  /** Add both sides of a corner part in one call. */
  addPair(name: string, componentId: string | null, explode: [number, number, number] | undefined, factory: () => Object3D) {
    return {
      R: this.add({ name: `R_${name}`, componentId, side: 'R', explode }, factory),
      L: this.add({ name: `L_${name}`, componentId, side: 'L', explode }, factory),
    };
  }

  get(name: string): Object3D {
    const o = this.byName.get(name);
    if (!o) throw new Error(`Part ${name} not registered`);
    return o;
  }

  finish(driver: Driver): SuspensionModel {
    // Record rest transforms so static parts can be restored before applying explode offsets.
    for (const { object } of this.parts) {
      this.base.set(object, { p: object.position.clone(), q: object.quaternion.toArray() as [number, number, number, number], s: object.scale.clone() });
    }
    let last: KinematicReport = { links: {}, angles: {} };
    const parts = this.parts;
    const base = this.base;
    return {
      key: this.key,
      root: this.root,
      parts,
      source: this.source.kind,
      missingNodes: [...this.missingFromGlb],
      update(frame) {
        for (const { object } of parts) {
          const b = base.get(object)!;
          object.position.copy(b.p);
          object.quaternion.fromArray(b.q);
          object.scale.copy(b.s);
        }
        last = driver(frame);
        if (frame.explode > 0) {
          for (const { def, object } of parts) {
            if (def.explode) object.position.add(new Vector3(...def.explode).multiplyScalar(frame.explode));
          }
        }
      },
      report: () => last,
      dispose: () => disposeObject(this.root),
    };
  }
}

/**
 * Span a "link-like" part from a to b. Procedural springs regenerate their coils in place;
 * everything else (incl. GLB nodes authored with unit length along +Y) is scaled along Y.
 */
export function span(obj: Object3D, a: Vector3, b: Vector3, mode: 'stretch' | 'rigid' = 'stretch') {
  const spring = obj.userData.spring as SpringGeometry | undefined;
  if (spring) {
    const len = placeBetween(obj, a, b, false);
    spring.setLength(len);
    return len;
  }
  return placeBetween(obj, a, b, mode === 'stretch');
}

export function disposeObject(root: Object3D) {
  root.traverse((o) => {
    if ((o as Mesh).isMesh) {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as Material[];
      mats.forEach((mat) => mat?.dispose());
    }
  });
}

function toPascal(s: string) {
  return s.split('-').map((w) => w[0]!.toUpperCase() + w.slice(1)).join('_');
}
