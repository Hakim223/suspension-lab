import type { AnimationMode } from '@suspension-lab/shared';
import type { Side } from '../rig/types';

/**
 * Illustrative motion generator.
 *
 * Model: per side, a single-degree-of-freedom "quarter body" excited through the road
 * (stiff tyre assumption): z_b'' = -ω²(z_b - r) - 2ζω(z_b' - r').
 * Suspension travel (compression +) = r - z_b. Viewed from the chassis, the road moves by -z_b.
 *
 * This is a teaching aid to show *qualitative* behaviour (e.g. a weak damper keeps oscillating).
 * It is NOT a validated vehicle-dynamics model: no tyre compliance, no coupling between sides,
 * no pitch/roll inertia, and parameters are representative, not vehicle-specific.
 */

export const TRAVEL_LIMIT = 0.085; // m, bump/rebound stop (illustrative)
export const BODY_FREQ_HZ = 1.3;
const DT = 1 / 240;

export interface TimelineOptions {
  dampingRatio: Record<Side, number>;
}

export interface SimSample {
  travel: Record<Side, number>;
  vel: Record<Side, number>;
  road: Record<Side, number>;
  body: Record<Side, number>;
  rack: number;
  rackVel: number;
  /** Vehicle speed used for wheel spin and road scrolling (m/s). */
  speed: number;
}

export interface Timeline {
  mode: AnimationMode;
  duration: number;
  sample(t: number): SimSample;
  /** Road height (relative to chassis) at `dz` metres ahead of the contact patch. */
  roadAhead(side: Side, t: number, dz: number): number;
}

const TWO_PI = Math.PI * 2;

function bumpRoad(t: number): number {
  // Speed hump: smooth half-cosine, 9 cm high, crossed in 0.32 s, starting at t=0.6 s.
  const t0 = 0.6;
  const len = 0.32;
  if (t < t0 || t > t0 + len) return 0;
  return 0.09 * 0.5 * (1 - Math.cos((TWO_PI * (t - t0)) / len));
}

function roughRoad(t: number, side: Side): number {
  // Periodic over 8 s (integer harmonics of 0.125 Hz); sides out of phase -> body roll input.
  const p = side === 'L' ? 0 : 1.7;
  return (
    0.028 * Math.sin(TWO_PI * 0.25 * t + p) +
    0.014 * Math.sin(TWO_PI * 0.75 * t + 2.1 * p + 0.4) +
    0.007 * Math.sin(TWO_PI * 1.625 * t + 0.6 * p)
  );
}

const MODE_CONFIG: Record<Exclude<AnimationMode, 'manual'>, { duration: number; speed: number }> = {
  bump: { duration: 5, speed: 3.0 },
  rough: { duration: 8, speed: 7.0 },
  steer: { duration: 6, speed: 1.2 },
};

const clamp = (x: number) => Math.max(-TRAVEL_LIMIT, Math.min(TRAVEL_LIMIT, x));

export function buildTimeline(mode: Exclude<AnimationMode, 'manual'>, opts: TimelineOptions): Timeline {
  const { duration, speed } = MODE_CONFIG[mode];
  const road = (side: Side, t: number) => {
    const tt = ((t % duration) + duration) % duration;
    if (mode === 'bump') return bumpRoad(tt);
    if (mode === 'rough') return roughRoad(tt, side);
    return 0;
  };
  const n = Math.round(duration / DT);
  const table: Record<Side, { body: Float32Array; travel: Float32Array }> = {
    L: { body: new Float32Array(n + 1), travel: new Float32Array(n + 1) },
    R: { body: new Float32Array(n + 1), travel: new Float32Array(n + 1) },
  };
  const w = TWO_PI * BODY_FREQ_HZ;
  for (const side of ['L', 'R'] as Side[]) {
    const zeta = opts.dampingRatio[side];
    let z = 0;
    let zv = 0;
    // Integrate two cycles (semi-implicit Euler, 2 substeps) and keep the second (steady-state, periodic).
    for (let cycle = 0; cycle < 2; cycle++) {
      for (let i = 0; i <= n; i++) {
        const t = i * DT;
        for (let s = 0; s < 2; s++) {
          const ts = t + (s * DT) / 2;
          const r = road(side, ts);
          const rv = (road(side, ts + 1e-3) - road(side, ts - 1e-3)) / 2e-3;
          const acc = -w * w * (z - r) - 2 * zeta * w * (zv - rv);
          zv += acc * (DT / 2);
          z += zv * (DT / 2);
        }
        if (cycle === 1) {
          table[side].body[i] = z;
          table[side].travel[i] = clamp(road(side, t) - z);
        }
      }
    }
  }
  const lookup = (arr: Float32Array, t: number) => {
    const tt = ((t % duration) + duration) % duration;
    const f = tt / DT;
    const i = Math.min(n - 1, Math.floor(f));
    const a = f - i;
    return arr[i]! * (1 - a) + arr[i + 1]! * a;
  };
  const rackAt = (t: number) => (mode === 'steer' ? Math.sin((TWO_PI * t) / duration) : 0);
  return {
    mode,
    duration,
    sample(t) {
      const e = 1 / 240;
      const s = {} as SimSample;
      s.travel = { L: lookup(table.L.travel, t), R: lookup(table.R.travel, t) };
      s.vel = {
        L: (lookup(table.L.travel, t + e) - lookup(table.L.travel, t - e)) / (2 * e),
        R: (lookup(table.R.travel, t + e) - lookup(table.R.travel, t - e)) / (2 * e),
      };
      s.body = { L: lookup(table.L.body, t), R: lookup(table.R.body, t) };
      s.road = { L: road('L', t), R: road('R', t) };
      s.rack = rackAt(t);
      s.rackVel = (rackAt(t + e) - rackAt(t - e)) / (2 * e);
      s.speed = speed;
      return s;
    },
    roadAhead(side, t, dz) {
      return road(side, t + dz / speed) - lookup(table[side].body, t);
    },
  };
}
