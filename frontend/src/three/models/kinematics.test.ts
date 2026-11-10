import { describe, expect, it } from 'vitest';
import { MODEL_REGISTRY } from './registry';
import type { RigFrame, SuspensionModel } from '../rig/types';
import { MAC_CONSTANTS } from './macpherson';
import { DW_CONSTANTS } from './doubleWishbone';
import { RA_CONSTANTS } from './rigidAxle';
import { ML_LINKS } from './multiLink';

const frame = (over: Partial<RigFrame> = {}): RigFrame => ({
  travel: { L: 0, R: 0 }, vel: { L: 0, R: 0 }, rack: 0, rackVel: 0, time: 0, wheelAngle: 0, explode: 0, damage: null, ...over,
});

const TRAVELS = [-0.08, -0.04, 0, 0.03, 0.06, 0.08];
const RACKS = [-1, -0.5, 0, 0.5, 1];

function sweep(model: SuspensionModel, steer: boolean, check: (r: ReturnType<SuspensionModel['report']>, t: number, rack: number) => void) {
  for (const t of TRAVELS) for (const rack of steer ? RACKS : [0]) {
    model.update(frame({ travel: { L: -t * 0.5, R: t }, rack }));
    check(model.report(), t, rack);
  }
}

describe('procedural models build with independently selectable parts', () => {
  for (const [key, entry] of Object.entries(MODEL_REGISTRY)) {
    it(`${key}: unique part names, component ids, both sides`, () => {
      const m = entry.build();
      const names = m.parts.map((p) => p.def.name);
      expect(new Set(names).size).toBe(names.length);
      const ids = new Set(m.parts.map((p) => p.def.componentId).filter(Boolean));
      expect(ids.size).toBeGreaterThanOrEqual(7);
      expect(names.some((n) => n.startsWith('R_'))).toBe(true);
      expect(names.some((n) => n.startsWith('L_'))).toBe(true);
      for (const p of m.parts) expect(p.object.userData.partName).toBe(p.def.name);
      m.dispose();
    });
  }
});

describe('MacPherson kinematics', () => {
  const m = MODEL_REGISTRY.macpherson!.build();
  it('keeps arm & tie-rod lengths, strut through top mount, wheel centre on target', () => {
    sweep(m, true, (r, t) => {
      expect(r.links.lowerArmR).toBeCloseTo(MAC_CONSTANTS.LC, 6);
      expect(r.links.tieRodR).toBeCloseTo(MAC_CONSTANTS.LTR, 5);
      expect(r.links.tieRodL).toBeCloseTo(MAC_CONSTANTS.LTR, 5);
      expect(r.links.strutResidualR).toBeLessThan(1e-5);
      expect(r.links.stabLinkR).toBeCloseTo(MAC_CONSTANTS.LK, 5);
      expect(r.angles.wheelCenterYR).toBeCloseTo(0.31 + t, 2); // steering lifts/lowers slightly (jacking)
    });
  });
  it('wheel centre tracks travel exactly when not steered', () => {
    for (const t of TRAVELS) {
      m.update(frame({ travel: { L: t, R: t } }));
      // Small residual (< 0.05 mm) is real bump-steer rotation about the inclined steering axis.
      expect(m.report().angles.wheelCenterYR).toBeCloseTo(0.31 + t, 4);
    }
  });
  it('steers both wheels the same way with Ackermann (inner wheel turns more)', () => {
    m.update(frame({ rack: 1 })); // left turn
    const { steerR, steerL } = m.report().angles;
    // Corner-local angles (rotation about the upward steering axis): a left turn rotates the
    // right wheel negatively; the left corner is mirrored so its local angle is positive.
    expect(steerR).toBeLessThan(-0.25);
    expect(steerL).toBeGreaterThan(0.25);
    expect(Math.abs(steerL!)).toBeGreaterThan(Math.abs(steerR!));
  });
  it('stabilizer bar twists only when sides move differently', () => {
    m.update(frame({ travel: { L: 0.05, R: 0.05 } }));
    const same = m.report().angles;
    expect(Math.abs(same.betaL! - same.betaR!)).toBeLessThan(1e-6);
    m.update(frame({ travel: { L: -0.05, R: 0.05 } }));
    const diff = m.report().angles;
    expect(Math.abs(diff.betaL! - diff.betaR!)).toBeGreaterThan(0.2);
  });
});

describe('Double wishbone kinematics', () => {
  const m = MODEL_REGISTRY['double-wishbone']!.build();
  it('keeps both arms, knuckle span and tie rods rigid', () => {
    sweep(m, true, (r) => {
      expect(r.links.lowerArmR).toBeCloseTo(DW_CONSTANTS.LL, 6);
      expect(r.links.upperArmR).toBeCloseTo(DW_CONSTANTS.LU, 6);
      expect(r.links.knuckleSpanR).toBeCloseTo(DW_CONSTANTS.KH, 6);
      expect(r.links.tieRodR).toBeCloseTo(DW_CONSTANTS.LTR, 5);
    });
  });
  it('wheel centre tracks travel (bump-steer residual < 0.05 mm)', () => {
    for (const t of TRAVELS) {
      m.update(frame({ travel: { L: t, R: t } }));
      expect(m.report().angles.wheelCenterYR).toBeCloseTo(0.31 + t, 4);
    }
  });
});

describe('Multi-link kinematics', () => {
  const m = MODEL_REGISTRY['multi-link']!.build();
  it('every link keeps a constant length over full travel', () => {
    const len0 = Object.fromEntries(Object.entries(ML_LINKS).map(([k, v]) => [k, v.chassis.distanceTo(v.carrier)]));
    sweep(m, false, (r, t) => {
      for (const k of Object.keys(len0)) expect(r.links[k]).toBeCloseTo(len0[k]!, 6);
      expect(r.links.wheelCenterY).toBeCloseTo(0.31 + t, 5);
    });
  });
});

describe('Torsion beam kinematics', () => {
  const m = MODEL_REGISTRY['torsion-beam']!.build();
  it('wheel centre tracks travel and the beam twists with unequal travel', () => {
    for (const t of TRAVELS) {
      m.update(frame({ travel: { L: t, R: t } }));
      expect(m.report().links.wheelCenterYR).toBeCloseTo(0.31 + t, 5);
      expect(Math.abs(m.report().angles.twist!)).toBeLessThan(1e-9);
    }
    m.update(frame({ travel: { L: -0.05, R: 0.05 } }));
    expect(Math.abs(m.report().angles.twist!)).toBeGreaterThan(0.15);
  });
});

describe('Rigid axle kinematics', () => {
  const m = MODEL_REGISTRY['rigid-axle']!.build();
  it('heave keeps link lengths (within Panhard lateral-shift compliance); Panhard always constant', () => {
    for (const t of TRAVELS) {
      m.update(frame({ travel: { L: t, R: t } }));
      const r = m.report();
      // Panhard arc shifts the axle sideways by a few mm; trailing links see < 0.2 mm (bushing compliance).
      expect(Math.abs(r.links.lowerR! - RA_CONSTANTS.LEN_LOWER)).toBeLessThan(2e-4);
      expect(Math.abs(r.links.upperL! - RA_CONSTANTS.LEN_UPPER)).toBeLessThan(2e-4);
      expect(r.links.panhard).toBeCloseTo(RA_CONSTANTS.LEN_PANHARD, 5);
      expect(r.angles.axleY).toBeCloseTo(0.31 + t, 6);
    }
  });
  it('roll tilts the whole axle; Panhard shifts it sideways; link change stays within bushing compliance', () => {
    m.update(frame({ travel: { L: -0.06, R: 0.06 } }));
    const r = m.report();
    expect(r.angles.roll).toBeGreaterThan(0.07);
    expect(r.links.panhard).toBeCloseTo(RA_CONSTANTS.LEN_PANHARD, 5);
    expect(Math.abs(r.links.lowerR! - RA_CONSTANTS.LEN_LOWER)).toBeLessThan(0.012);
  });
});

describe('exploded view moves parts and returns exactly', () => {
  it('restores assembled pose', () => {
    const m = MODEL_REGISTRY.macpherson!.build();
    m.update(frame());
    const wheel = m.parts.find((p) => p.def.name === 'R_Wheel')!.object;
    const p0 = wheel.position.clone();
    m.update(frame({ explode: 1 }));
    expect(wheel.position.distanceTo(p0)).toBeGreaterThan(0.4);
    m.update(frame({ explode: 0 }));
    expect(wheel.position.distanceTo(p0)).toBeLessThan(1e-9);
  });
});
