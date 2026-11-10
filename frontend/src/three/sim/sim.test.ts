import { describe, expect, it } from 'vitest';
import { buildTimeline, TRAVEL_LIMIT } from './timeline';
import { cornerDamage, NO_DAMAGE } from './damageEffects';
import type { RigFrame } from '../rig/types';

const energyAfter = (zeta: number, from: number, to: number) => {
  const tl = buildTimeline('bump', { dampingRatio: { L: 0.4, R: zeta } });
  let e = 0;
  for (let t = from; t < to; t += 0.01) e += tl.sample(t).travel.R ** 2;
  return e;
};

describe('timeline', () => {
  it('bump mode compresses then rebounds within travel limits', () => {
    const tl = buildTimeline('bump', { dampingRatio: { L: 0.4, R: 0.4 } });
    let max = -1, min = 1;
    for (let t = 0; t < tl.duration; t += 0.005) {
      const s = tl.sample(t);
      max = Math.max(max, s.travel.R);
      min = Math.min(min, s.travel.R);
      expect(Math.abs(s.travel.R)).toBeLessThanOrEqual(TRAVEL_LIMIT + 1e-9);
    }
    expect(max).toBeGreaterThan(0.045);
    expect(min).toBeLessThan(-0.005);
  });

  it('a weak damper keeps oscillating after the bump', () => {
    expect(energyAfter(0.07, 1.6, 4.5)).toBeGreaterThan(5 * energyAfter(0.4, 1.6, 4.5));
  });

  it('rough road excites left and right differently (body roll input)', () => {
    const tl = buildTimeline('rough', { dampingRatio: { L: 0.4, R: 0.4 } });
    let diff = 0;
    for (let t = 0; t < tl.duration; t += 0.05) diff = Math.max(diff, Math.abs(tl.sample(t).travel.L - tl.sample(t).travel.R));
    expect(diff).toBeGreaterThan(0.02);
  });

  it('steer mode sweeps the rack fully and keeps wheels at ride height', () => {
    const tl = buildTimeline('steer', { dampingRatio: { L: 0.4, R: 0.4 } });
    expect(tl.sample(tl.duration / 4).rack).toBeCloseTo(1, 5);
    expect(tl.sample((3 * tl.duration) / 4).rack).toBeCloseTo(-1, 5);
    expect(tl.sample(1).travel.R).toBeCloseTo(0, 9);
  });

  it('is periodic', () => {
    const tl = buildTimeline('rough', { dampingRatio: { L: 0.4, R: 0.4 } });
    expect(tl.sample(1.234).travel.L).toBeCloseTo(tl.sample(1.234 + tl.duration).travel.L, 6);
  });

  it('road under the contact patch matches suspension travel (tyre stays on the road)', () => {
    const tl = buildTimeline('bump', { dampingRatio: { L: 0.4, R: 0.4 } });
    for (const t of [0.7, 0.9, 1.5]) expect(tl.roadAhead('R', t, 0)).toBeCloseTo(tl.sample(t).travel.R, 3);
  });
});

describe('damage effects', () => {
  const f = (vR: number): RigFrame => ({ travel: { L: 0, R: 0 }, vel: { L: 0, R: vR }, rack: 0, rackVel: 0, time: 1.3, wheelAngle: 0, explode: 0, damage: null });
  const dmg = (kind: Parameters<typeof cornerDamage>[0] extends infer D ? D extends { kind: infer K } ? K : never : never, params: Record<string, number>) => ({ kind, params, intensity: 1 });

  it('applies only to the right side (left stays the healthy reference)', () => {
    expect(cornerDamage(dmg('ball-joint-play', { playMm: 5 }), f(0.3), 'L')).toBe(NO_DAMAGE);
    expect(cornerDamage(null, f(0.3), 'R')).toBe(NO_DAMAGE);
  });

  it('ball-joint play knocks in the load direction, scaled by params', () => {
    const d = cornerDamage(dmg('ball-joint-play', { playMm: 5, visualExaggeration: 2 }), f(0.5), 'R');
    expect(d.ballJointOffset.y).toBeGreaterThan(0.009);
    expect(d.ballJointOffset.y).toBeLessThanOrEqual(0.0101);
  });

  it('intensity 0 disables damage', () => {
    expect(cornerDamage({ ...dmg('bushing-play', { playMm: 5 }), intensity: 0 }, f(0.5), 'R')).toBe(NO_DAMAGE);
  });

  it('strut mount sags; tie-rod produces toe wobble; link play changes effective length', () => {
    expect(cornerDamage(dmg('strut-mount-worn', { sagMm: 8, playMm: 4 }), f(0), 'R').mountOffset.y).toBeLessThan(-0.005);
    expect(Math.abs(cornerDamage(dmg('tie-rod-play', { toeWobbleDeg: 1.2 }), { ...f(0.4), time: 0.05 }, 'R').toeWobble)).toBeGreaterThan(0);
    expect(Math.abs(cornerDamage(dmg('stabilizer-link-loose', { playMm: 10 }), f(0.5), 'R').linkPlay)).toBeGreaterThan(0.005);
  });
});
