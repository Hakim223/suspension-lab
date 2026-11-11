import { describe, expect, it } from 'vitest';
import { SUSPENSION_IDS, DAMAGE_SIM_KINDS, components as consumerComponents } from '@suspension-lab/shared';
import { ARCHITECTURES, MECH_COMPONENTS, STEERING_SYSTEMS, findSteeringPart, getMechComponent, type FailureMode } from './data';
import { DIAGNOSTIC_CASES, COMPLAINT_LABELS } from './data/diagnostics';
import { ANATOMY_MODELS, anatomyFailures } from './anatomy/models';
import { ANATOMY_CATALOG } from './anatomy/catalog';
import { applyBacklash, solveSteering } from './steering/steeringModel';
import { MODEL_REGISTRY } from '../three/models/registry';

const nonEmpty = (s?: string) => !!s && s.trim().length > 5;
const allFailures = (): Array<[string, FailureMode]> => [
  ...MECH_COMPONENTS.flatMap((c) => c.failureModes.map((f) => [c.id, f] as [string, FailureMode])),
  ...STEERING_SYSTEMS.flatMap((s) => s.parts.flatMap((p) => p.failureModes.map((f) => [p.id, f] as [string, FailureMode]))),
];

describe('Mechanic data: hierarchy', () => {
  it('covers all five architectures with architecture-specific component sets', () => {
    expect(ARCHITECTURES.map((a) => a.id).sort()).toEqual([...SUSPENSION_IDS].sort());
    const sets = ARCHITECTURES.map((a) => a.assemblies.flatMap((x) => x.components.map((c) => c.componentId)).sort().join());
    expect(new Set(sets).size).toBe(5);
    const ids = (id: string) => ARCHITECTURES.find((a) => a.id === id)!.assemblies.flatMap((x) => x.components.map((c) => c.componentId));
    expect(ids('macpherson')).toContain('strut-mount');
    expect(ids('macpherson')).not.toContain('upper-control-arm');
    expect(ids('torsion-beam')).not.toContain('outer-tie-rod-end');
    expect(ids('rigid-axle')).toContain('panhard-rod');
  });

  it('every referenced component exists and has subcomponents and failure modes', () => {
    for (const a of ARCHITECTURES) for (const as of a.assemblies) for (const r of as.components) {
      const c = getMechComponent(r.componentId);
      expect(c, `${a.id}:${r.componentId}`).toBeDefined();
      expect(c!.subcomponents.length, c!.id).toBeGreaterThanOrEqual(1);
      expect(c!.failureModes.length, c!.id).toBeGreaterThanOrEqual(1);
      expect(nonEmpty(r.role)).toBe(true);
    }
  });

  it('3D references point to parts that exist in the procedural models', () => {
    const known = new Set(consumerComponents.map((c) => c.id));
    for (const c of MECH_COMPONENTS) if (c.model3d) expect(known, c.id).toContain(c.model3d);
    // and each 3D-capable architecture actually renders them
    for (const a of ARCHITECTURES) {
      const m = MODEL_REGISTRY[a.id]!.build();
      const present = new Set(m.parts.map((p) => p.def.componentId));
      for (const as of a.assemblies) for (const r of as.components) {
        const c = getMechComponent(r.componentId)!;
        if (c.model3d && !['tension-rod'].includes(c.id) && c.model3d !== 'strut-assembly') expect(present, `${a.id}:${c.id}`).toContain(c.model3d);
      }
      m.dispose();
    }
  });

  it('includes the required reference subcomponents', () => {
    const subs = new Set(MECH_COMPONENTS.flatMap((c) => c.subcomponents.map((s) => s.name.toLowerCase())));
    const has = (w: string) => [...subs].some((s) => s.includes(w));
    for (const w of ['batang piston', 'piston', 'katup', 'sil oli', 'dust boot', 'bump stop', 'dudukan per', 'isolator karet', 'bearing strut', 'pelat dudukan', 'sleeve', 'ball stud', 'liner']) expect(has(w), w).toBe(true);
  });
});

describe('Mechanic data: failure modes', () => {
  it('every failure explains all six aspects', () => {
    for (const [owner, f] of allFailures()) {
      const tag = `${owner}/${f.id}`;
      expect(nonEmpty(f.whatFails), tag).toBe(true);
      expect(nonEmpty(f.cause), tag).toBe(true);
      expect(nonEmpty(f.mechanicalEffect), tag).toBe(true);
      expect(f.symptoms.length, tag).toBeGreaterThan(0);
      expect(f.inspection.length, tag).toBeGreaterThan(0);
      expect(f.differentiation.length, tag).toBeGreaterThan(0);
      if (f.sim) expect(DAMAGE_SIM_KINDS, tag).toContain(f.sim.kind);
    }
  });

  it('failure ids are unique within a component and subcomponent refs are valid', () => {
    for (const c of MECH_COMPONENTS) {
      const ids = c.failureModes.map((f) => f.id);
      expect(new Set(ids).size, c.id).toBe(ids.length);
      for (const f of c.failureModes) if (f.subcomponentId) expect(c.subcomponents.map((s) => s.id), `${c.id}/${f.id}`).toContain(f.subcomponentId);
    }
  });

  it('has the specific (non-generic) mechanisms required', () => {
    const ids = (c: string) => getMechComponent(c)!.failureModes.map((f) => f.id);
    expect(ids('outer-tie-rod-end')).toEqual(expect.arrayContaining(['stud-wear', 'socket-wear', 'radial-play', 'axial-play', 'boot-torn', 'grease-loss', 'contamination', 'corrosion', 'seizure']));
    expect(ids('strut-mount')).toEqual(expect.arrayContaining(['insulator-deterioration', 'rubber-separation', 'bearing-wear', 'bearing-seizure', 'plate-damage', 'nut-loose']));
    expect(ids('control-arm-bushing')).toEqual(expect.arrayContaining(['hardening', 'cracking', 'tearing', 'separation', 'deformation', 'wrong-preload']));
    expect(ids('shock-absorber')).toEqual(expect.arrayContaining(['oil-leak', 'valve-degradation', 'reduced-damping', 'rod-damage', 'bent-rod', 'seal-failure', 'internal-binding']));
    // Different mechanisms must not share an identical simulation
    const tre = getMechComponent('outer-tie-rod-end')!.failureModes;
    expect(tre.find((f) => f.id === 'boot-torn')!.sim).toBeUndefined();
    expect(tre.find((f) => f.id === 'radial-play')!.sim!.params.toeWobbleDeg).toBeGreaterThan(tre.find((f) => f.id === 'stud-wear')!.sim!.params.toeWobbleDeg!);
  });
});

describe('Steering module', () => {
  it('has mechanical, HPS and EPS systems with all required parts', () => {
    expect(STEERING_SYSTEMS.map((s) => s.id)).toEqual(['mechanical', 'hps', 'eps']);
    for (const id of ['rack-housing', 'rack-gear', 'pinion-gear', 'rack-guide', 'inner-tie-rod', 'outer-tie-rod-end', 'rack-mount-bushing', 'steering-shaft', 'steering-coupling', 'ps-pump', 'ps-pulley', 'ps-reservoir', 'ps-hoses', 'ps-control-valve', 'ps-cylinder', 'eps-torque-sensor', 'eps-motor', 'eps-reduction', 'eps-ecu', 'eps-angle-sensor', 'eps-column']) {
      expect(findSteeringPart(id), id).not.toBeNull();
    }
    expect(STEERING_SYSTEMS[2]!.variants!.map((v) => v.name.split(' ')[0])).toEqual(['Column-assist', 'Pinion-assist', 'Rack-assist']);
  });

  it('EPS failures distinguish electronic from mechanical domains', () => {
    const eps = STEERING_SYSTEMS[2]!.parts.flatMap((p) => p.failureModes);
    expect(eps.some((f) => f.domain === 'elektronik')).toBe(true);
    expect(eps.some((f) => f.domain === 'elektrik')).toBe(true);
    expect(eps.some((f) => f.domain === 'mekanis')).toBe(true);
  });

  const base = { speedKmh: 0, rpm: 750, direction: 1 as const, swDeg: 360 };
  it('power assistance reduces parking effort; a failed system is heavier', () => {
    const manual = solveSteering({ ...base, system: 'mechanical', fault: {} });
    const hps = solveSteering({ ...base, system: 'hps', fault: {} });
    const eps = solveSteering({ ...base, system: 'eps', fault: {} });
    expect(manual.driverTorqueNm).toBeGreaterThan(20);
    expect(hps.driverTorqueNm).toBeLessThan(manual.driverTorqueNm / 4);
    expect(eps.driverTorqueNm).toBeLessThan(manual.driverTorqueNm / 3);
    const lowFluid = solveSteering({ ...base, system: 'hps', fault: { pressureFactor: 0.6, idlePressureFactor: 0.5 } });
    expect(lowFluid.driverTorqueNm).toBeGreaterThan(hps.driverTorqueNm);
    const epsDead = solveSteering({ ...base, system: 'eps', fault: { assistFactor: 0 } });
    expect(epsDead.driverTorqueNm).toBeCloseTo(manual.driverTorqueNm, 1);
  });

  it('pump wear shows mainly at idle', () => {
    const f = { idlePressureFactor: 0.45, pressureFactor: 0.85 };
    const idle = solveSteering({ ...base, system: 'hps', fault: f });
    const high = solveSteering({ ...base, system: 'hps', rpm: 2000, fault: f });
    expect(idle.driverTorqueNm).toBeGreaterThan(high.driverTorqueNm);
  });

  it('EPS torque-sensor offset creates a hands-off pull; seizure prevents self-centring', () => {
    expect(Math.abs(solveSteering({ ...base, swDeg: 0, system: 'eps', speedKmh: 60, fault: { sensorOffsetNm: 1.2 } }).handsOffForceN)).toBeGreaterThan(0);
    expect(solveSteering({ ...base, swDeg: 300, system: 'eps', speedKmh: 40, fault: {} }).centringN).toBeGreaterThan(0);
    expect(solveSteering({ ...base, swDeg: 300, system: 'eps', speedKmh: 40, fault: findSteeringPart('outer-tie-rod-end')!.part.failureModes.find((f) => f.id === 'seizure')!.model }).centringN).toBeLessThan(0);
  });

  it('free play is a dead-band', () => {
    let out = 0;
    out = applyBacklash(out, 2, 6);
    expect(out).toBe(0);
    out = applyBacklash(out, 10, 6);
    expect(out).toBe(7);
    out = applyBacklash(out, 6, 6);
    expect(out).toBe(7);
  });
});

describe('Anatomy & diagnostics', () => {
  it('catalog matches the models; each model has selectable parts, cutaway parts and failures', () => {
    expect(ANATOMY_MODELS.map((m) => m.id)).toEqual(ANATOMY_CATALOG.map((c) => c.id));
    for (const m of ANATOMY_MODELS) {
      expect(new Set(m.parts.map((p) => p.id)).size, m.id).toBe(m.parts.length);
      expect(m.parts.some((p) => p.cut), m.id).toBe(true);
      expect(anatomyFailures(m).length, m.id).toBeGreaterThan(2);
      for (const v of Object.values(m.failures)) for (const p of v.parts) expect(m.parts.map((x) => x.id), `${m.id}:${p}`).toContain(p);
      for (const p of m.parts) expect(() => p.build()).not.toThrow();
    }
  });

  it('diagnostic cases cover all complaint categories with valid references', () => {
    expect(new Set(DIAGNOSTIC_CASES.map((c) => c.category))).toEqual(new Set(Object.keys(COMPLAINT_LABELS)));
    for (const d of DIAGNOSTIC_CASES) {
      expect(d.possibleCauses.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.possibleCauses.filter((c) => c.confirmed).length, d.id).toBe(1);
      for (const c of [...d.possibleCauses.map((x) => x.ref), ...d.inspectComponents]) {
        expect(!!getMechComponent(c) || !!findSteeringPart(c), `${d.id}:${c}`).toBe(true);
      }
      for (const c of d.possibleCauses) if (c.failureId) {
        const list = getMechComponent(c.ref)?.failureModes ?? findSteeringPart(c.ref)?.part.failureModes ?? [];
        expect(list.map((f) => f.id), `${d.id}:${c.ref}/${c.failureId}`).toContain(c.failureId);
      }
      for (const k of ['procedure', 'alternatives', 'distinctions', 'conditions'] as const) expect(d[k].length, `${d.id}.${k}`).toBeGreaterThan(0);
    }
  });
});
