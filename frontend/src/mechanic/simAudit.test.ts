import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ARCHITECTURES, getMechComponent } from './data';
import { MODEL_REGISTRY } from '../three/models/registry';
import type { RigFrame } from '../three/rig/types';

/** Largest displacement of any part between normal and failed over a set of probe frames. */
export function simEffect(archId: string, kind: string, params: Record<string, number>) {
  const m = MODEL_REGISTRY[archId]!.build();
  let max = 0; let where = '';
  for (let i = 0; i < 24; i++) {
    const t = i * 0.13;
    const base: RigFrame = { travel: { L: 0.02 * Math.sin(t * 3), R: 0.03 * Math.sin(t * 2) }, vel: { L: 0.3 * Math.cos(t * 3), R: 0.4 * Math.cos(t * 2) }, rack: Math.sin(t), rackVel: Math.cos(t), time: t, wheelAngle: 0, explode: 0, damage: null };
    m.update(base); m.root.updateMatrixWorld(true);
    const ref = m.parts.map((p) => p.object.getWorldPosition(new Vector3()));
    const refQ = m.parts.map((p) => p.object.quaternion.clone());
    m.update({ ...base, damage: { kind: kind as never, params, intensity: 1 } }); m.root.updateMatrixWorld(true);
    m.parts.forEach((p, k) => {
      const d = p.object.getWorldPosition(new Vector3()).distanceTo(ref[k]!) + p.object.quaternion.angleTo(refQ[k]!) * 0.1;
      if (d > max) { max = d; where = p.def.name; }
    });
  }
  m.dispose();
  return { max, where };
}

describe('audit: every 3D failure simulation visibly changes the model', () => {
  for (const a of ARCHITECTURES) for (const as of a.assemblies) for (const r of as.components) {
    const c = getMechComponent(r.componentId)!;
    for (const f of c.failureModes) {
      if (!f.sim || !(f.sim.target ?? c.model3d)) continue;
      if (['damper-change', 'weak-damper', 'spring-sag'].includes(f.sim.kind)) continue; // timeline / ride-height effects
      it(`${a.id} · ${c.id} · ${f.id} (${f.sim.kind})`, () => {
        const e = simEffect(a.id, f.sim!.kind, f.sim!.params);
        expect(e.max, `no visible effect`).toBeGreaterThan(0.0008);
      });
    }
  }
});

/** Per-part displacement (max over probe frames) between normal and failed. */
function partEffects(archId: string, kind: string, params: Record<string, number>) {
  const m = MODEL_REGISTRY[archId]!.build();
  const out = new Map<string, number>();
  for (let i = 0; i < 24; i++) {
    const t = i * 0.13;
    const base: RigFrame = { travel: { L: 0.02 * Math.sin(t * 3), R: 0.03 * Math.sin(t * 2) }, vel: { L: 0.3 * Math.cos(t * 3), R: 0.4 * Math.cos(t * 2) }, rack: Math.sin(t), rackVel: Math.cos(t), time: t, wheelAngle: 0, explode: 0, damage: null };
    m.update(base); m.root.updateMatrixWorld(true);
    const ref = m.parts.map((p) => ({ p: p.object.getWorldPosition(new Vector3()), q: p.object.quaternion.clone() }));
    m.update({ ...base, damage: { kind: kind as never, params, intensity: 1 } }); m.root.updateMatrixWorld(true);
    m.parts.forEach((p, k) => {
      const d = p.object.getWorldPosition(new Vector3()).distanceTo(ref[k]!.p) + p.object.quaternion.angleTo(ref[k]!.q) * 0.1;
      out.set(p.def.name, Math.max(out.get(p.def.name) ?? 0, d));
    });
  }
  m.dispose();
  return out;
}

describe('audit: the simulation moves the part that actually failed', () => {
  it('upper ball-joint play displaces the knuckle top, not the lower joint', () => {
    const e = partEffects('double-wishbone', 'ball-joint-play', { playMm: 1.5, upper: 1, visualExaggeration: 4 });
    // (the lower arm re-angles by ~1 mm because the wheel stays on the road)
    expect(e.get('R_Knuckle')!).toBeGreaterThan(0.002); // knuckle tilts about the lower joint
    expect(e.get('R_Lower_Ball_Joint')!).toBeLessThan(e.get('R_Knuckle')!);
  });
  it('lower ball-joint play opens a gap between the arm-side joint and the knuckle', () => {
    const e = partEffects('double-wishbone', 'ball-joint-play', { playMm: 1.5, visualExaggeration: 4 });
    // With the tyre on the road, the clearance shows as the arm-side joint moving relative to the knuckle.
    expect(Math.max(e.get('R_Knuckle')!, e.get('R_Lower_Ball_Joint')!)).toBeGreaterThan(0.003);
    expect(e.get('R_Upper_Ball_Joint')!).toBeLessThan(0.003);
  });
  it('multi-link upper-link bushing play moves the upper links, not the lower arm pivot', () => {
    const e = partEffects('multi-link', 'bushing-play', { playMm: 3, upper: 1, visualExaggeration: 3 });
    expect(e.get('R_Upper_Link_Front')!).toBeGreaterThan(0.001);
    expect(e.get('R_Lower_Arm')!).toBeLessThan(e.get('R_Upper_Link_Front')! / 3);
  });
  it('toe-link joint play yaws the rear hub carrier', () => {
    const e = partEffects('multi-link', 'tie-rod-play', { toeWobbleDeg: 0.5, visualExaggeration: 4 });
    expect(e.get('R_Hub_Carrier')!).toBeGreaterThan(0.001);
  });
  it('Panhard bushing play shifts the whole rigid axle sideways', () => {
    const e = partEffects('rigid-axle', 'bushing-play', { playMm: 5, lateral: 1, visualExaggeration: 3 });
    expect(e.get('C_Axle_Housing')!).toBeGreaterThan(0.003);
    expect(e.get('L_Wheel')!).toBeGreaterThan(0.003);
  });
  it('corner failures never disturb the healthy left side', () => {
    const cases: Array<[string, string, Record<string, number>]> = [
      ['macpherson', 'ball-joint-play', { playMm: 5, visualExaggeration: 3 }],
      ['macpherson', 'strut-mount-worn', { sagMm: 8, playMm: 5, visualExaggeration: 3 }],
      ['macpherson', 'tie-rod-play', { toeWobbleDeg: 1.2, visualExaggeration: 3 }],
      ['double-wishbone', 'bushing-play', { playMm: 6, visualExaggeration: 3 }],
      ['torsion-beam', 'wheel-bearing-play', { playDeg: 0.4, visualExaggeration: 3 }],
      ['multi-link', 'bushing-play', { playMm: 3, upper: 1, visualExaggeration: 3 }],
    ];
    for (const [arch, kind, params] of cases) {
      const e = partEffects(arch, kind, params);
      for (const [name, d] of e) if (name.startsWith('L_') && !name.includes('Stabilizer')) expect(d, `${arch}/${kind}/${name}`).toBeLessThan(1e-6);
    }
  });
  it('resetting (no damage) restores the exact normal pose', () => {
    const m = MODEL_REGISTRY.macpherson!.build();
    const f: RigFrame = { travel: { L: 0.01, R: 0.02 }, vel: { L: 0.2, R: 0.3 }, rack: 0.3, rackVel: 0.5, time: 1, wheelAngle: 0, explode: 0, damage: null };
    m.update(f); m.root.updateMatrixWorld(true);
    const ref = m.parts.map((p) => p.object.getWorldPosition(new Vector3()));
    m.update({ ...f, damage: { kind: 'strut-mount-worn', params: { sagMm: 8, playMm: 5, visualExaggeration: 3 }, intensity: 1 } });
    m.update({ ...f, damage: { kind: 'ball-joint-play', params: { playMm: 5, visualExaggeration: 3 }, intensity: 1 } });
    m.update(f); m.root.updateMatrixWorld(true);
    m.parts.forEach((p, k) => expect(p.object.getWorldPosition(new Vector3()).distanceTo(ref[k]!), p.def.name).toBeLessThan(1e-9));
    // child-level effects must reset too (strut-mount rubber squash)
    const rubber = m.parts.find((p) => p.def.name === 'R_Strut_Mount')!.object.getObjectByName('rubber')!;
    expect(rubber.scale.y).toBeCloseTo(1, 9);
  });
});
