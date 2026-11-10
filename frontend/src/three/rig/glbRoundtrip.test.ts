import { describe, expect, it } from 'vitest';
import { Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_REGISTRY } from '../models/registry';
import { exportModelToGlb } from './glbExport';
import type { PartSource } from './builder';
import type { RigFrame } from './types';

async function glbSource(buf: ArrayBuffer): Promise<PartSource> {
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  const nodes = new Map<string, Object3D>();
  gltf.scene.traverse((o) => { if (o.name && !nodes.has(o.name)) nodes.set(o.name, o); });
  return { kind: 'glb', lookup: (n) => nodes.get(n)?.clone(true) ?? null };
}

const frame = (travelR: number, rack: number): RigFrame => ({
  travel: { L: -travelR / 2, R: travelR }, vel: { L: 0, R: 0 }, rack, rackVel: 0, time: 0, wheelAngle: 0.7, explode: 0, damage: null,
});

describe('GLB replacement path (export procedural -> load as GLB -> same rig)', () => {
  for (const key of Object.keys(MODEL_REGISTRY)) {
    it(`${key}: every part binds by name and poses identically`, async () => {
      const entry = MODEL_REGISTRY[key]!;
      const proc = entry.build();
      const buf = await exportModelToGlb(proc);
      expect(buf.byteLength).toBeGreaterThan(10_000);
      const src = await glbSource(buf);
      const glb = entry.build(src);
      expect(glb.source).toBe('glb');
      expect(glb.missingNodes).toEqual([]);
      // The GLB objects are distinct instances (not the procedural factory output).
      expect(glb.parts.every((p) => p.object.userData.partName === p.def.name)).toBe(true);
      for (const [t, rack] of [[0.06, 0.5], [-0.05, -1], [0, 0]] as const) {
        proc.update(frame(t, rack));
        glb.update(frame(t, rack));
        proc.root.updateMatrixWorld(true);
        glb.root.updateMatrixWorld(true);
        for (const p of proc.parts) {
          const g = glb.parts.find((x) => x.def.name === p.def.name)!;
          const a = p.object.getWorldPosition(new Vector3());
          const b = g.object.getWorldPosition(new Vector3());
          expect(a.distanceTo(b), p.def.name).toBeLessThan(1e-4);
        }
      }
    });
  }
});
