import { Quaternion, Vector3 } from 'three';

export const AX = new Vector3(1, 0, 0);
export const AY = new Vector3(0, 1, 0);
export const AZ = new Vector3(0, 0, 1);

export const v3 = (x: number, y: number, z = 0) => new Vector3(x, y, z);

/**
 * Robust 1-D root finder: bisection on [lo, hi]. If the interval is not bracketed it scans
 * sub-intervals for a sign change; if none exists it returns the point with the smallest |f|.
 */
export function solveRoot(f: (x: number) => number, lo: number, hi: number, iters = 42): number {
  let a = lo;
  let b = hi;
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (Math.sign(fa) === Math.sign(fb)) {
    const n = 24;
    let best = Math.abs(fa) < Math.abs(fb) ? a : b;
    let bestV = Math.min(Math.abs(fa), Math.abs(fb));
    let prevX = a;
    let prevF = fa;
    let found = false;
    for (let i = 1; i <= n; i++) {
      const x = lo + ((hi - lo) * i) / n;
      const fx = f(x);
      if (Math.abs(fx) < bestV) { bestV = Math.abs(fx); best = x; }
      if (Math.sign(fx) !== Math.sign(prevF)) { a = prevX; b = x; fa = prevF; fb = fx; found = true; break; }
      prevX = x; prevF = fx;
    }
    if (!found) return best;
  }
  for (let i = 0; i < iters; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fm === 0) return m;
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; fb = fm; }
  }
  return 0.5 * (a + b);
}

/** Intersection of two circles in the XY plane; returns the solution with the larger (or smaller) y. */
export function circleIntersect(c1: Vector3, r1: number, c2: Vector3, r2: number, preferUpper = true): Vector3 | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return null;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1.x + (a * dx) / d;
  const my = c1.y + (a * dy) / d;
  const p1 = new Vector3(mx + (h * dy) / d, my - (h * dx) / d, 0);
  const p2 = new Vector3(mx - (h * dy) / d, my + (h * dx) / d, 0);
  return (p1.y > p2.y) === preferUpper ? p1 : p2;
}

/** Rotate a point about an axis through `origin`. */
export function rotateAbout(p: Vector3, origin: Vector3, axis: Vector3, angle: number, out = new Vector3()): Vector3 {
  const q = new Quaternion().setFromAxisAngle(axis, angle);
  return out.copy(p).sub(origin).applyQuaternion(q).add(origin);
}

/** Planar angle of vector (b - a) in XY. */
export const angleXY = (a: Vector3, b: Vector3) => Math.atan2(b.y - a.y, b.x - a.x);

/** Angle of (b - a) in the YZ plane, measured as rotation about +X. */
export const angleYZ = (a: Vector3, b: Vector3) => Math.atan2(b.z - a.z, b.y - a.y);

/** Rigid transform: world = position + q * (local - origin0). */
export class RigidPose {
  constructor(public position = new Vector3(), public q = new Quaternion(), public origin0 = new Vector3()) {}
  apply(p0: Vector3, out = new Vector3()): Vector3 {
    return out.copy(p0).sub(this.origin0).applyQuaternion(this.q).add(this.position);
  }
}

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const deg = (r: number) => (r * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
