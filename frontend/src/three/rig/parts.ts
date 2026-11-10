import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
} from 'three';
import { AX, AY, AZ } from './math';

/* ----------------------------------------------------------------------------
 * Materials. Every call returns a NEW material so each part can be highlighted
 * independently (selection, hover, damage tint, ghosting).
 * ------------------------------------------------------------------------- */
const std = (color: string, metalness: number, roughness: number, extra: Partial<MeshStandardMaterial> = {}) =>
  new MeshStandardMaterial({ color, metalness, roughness, ...extra });

export const MAT = {
  steel: () => std('#9aa5b5', 0.75, 0.32),
  arm: () => std('#3d4656', 0.55, 0.5),
  cast: () => std('#6f7887', 0.5, 0.55),
  rubber: () => std('#1b1d22', 0.0, 0.9),
  boot: () => std('#25272d', 0.0, 0.8),
  spring: () => std('#b8443b', 0.35, 0.45),
  damper: () => std('#c9a227', 0.45, 0.4),
  chrome: () => std('#e3e8ef', 1.0, 0.12),
  bar: () => std('#2f3846', 0.6, 0.45),
  barStripe: () => std('#7dd3fc', 0.2, 0.4),
  rack: () => std('#5c6675', 0.6, 0.45),
  hub: () => std('#aab3c0', 0.8, 0.3),
  tire: () => std('#16181c', 0.0, 0.85, { transparent: true, opacity: 0.55 }),
  rim: () => std('#c3cad4', 0.85, 0.25, { transparent: true, opacity: 0.55 }),
  axle: () => std('#4a5262', 0.55, 0.5),
  context: () => std('#3a4a63', 0.2, 0.7, { transparent: true, opacity: 0.28, depthWrite: false }),
};

/* ----------------------------------------------------------------------------
 * Primitive helpers
 * ------------------------------------------------------------------------- */
const tmpQ = new Quaternion();
const tmpV = new Vector3();

export function mesh(geometry: BufferGeometry, material: Material): Mesh {
  const m = new Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Cylinder whose base sits at the origin and extends +Y by `len` (pivot-at-base convention). */
export function rodGeometry(r: number, len = 1, radial = 16): CylinderGeometry {
  const g = new CylinderGeometry(r, r, len, radial, 1);
  g.translate(0, len / 2, 0);
  return g;
}

/** Static cylinder between two points (expressed in the parent's coordinates). */
export function segment(a: Vector3, b: Vector3, r: number, material: Material, radial = 14): Mesh {
  const len = a.distanceTo(b);
  const m = mesh(rodGeometry(r, len, radial), material);
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(AY, tmpV.copy(b).sub(a).normalize());
  return m;
}

/** Static rectangular beam between two points with cross-section w × h. `up` orients the h side. */
export function beam(a: Vector3, b: Vector3, w: number, h: number, material: Material, up: Vector3 = AY): Mesh {
  const len = a.distanceTo(b);
  const g = new BoxGeometry(len, h, w);
  const m = mesh(g, material);
  const dir = tmpV.copy(b).sub(a).normalize();
  // Build a basis: x' = dir, y' = up projected, z' = x' × y'
  const upP = up.clone().addScaledVector(dir, -up.dot(dir));
  if (upP.lengthSq() < 1e-8) upP.copy(Math.abs(dir.y) < 0.9 ? AY : AZ);
  upP.normalize();
  const zP = new Vector3().crossVectors(dir, upP);
  const basis = new Object3D();
  basis.matrix.makeBasis(dir, upP, zP);
  m.quaternion.setFromRotationMatrix(basis.matrix);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  return m;
}

export function sphere(p: Vector3, r: number, material: Material): Mesh {
  const m = mesh(new SphereGeometry(r, 18, 12), material);
  m.position.copy(p);
  return m;
}

/** Bushing: rubber sleeve + metal outer ring, axis along `axis`. */
export function bushing(p: Vector3, axis: Vector3, rOuter: number, len: number): Group {
  const g = new Group();
  const rubber = mesh(new CylinderGeometry(rOuter, rOuter, len, 18), MAT.rubber());
  const sleeve = mesh(new CylinderGeometry(rOuter * 0.42, rOuter * 0.42, len * 1.25, 12), MAT.steel());
  const ring = mesh(new TorusGeometry(rOuter * 1.02, rOuter * 0.16, 8, 20), MAT.steel());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = len / 2;
  const ring2 = ring.clone();
  ring2.material = MAT.steel();
  ring2.position.y = -len / 2;
  g.add(rubber, sleeve, ring, ring2);
  g.position.copy(p);
  g.quaternion.setFromUnitVectors(AY, axis.clone().normalize());
  return g;
}

/** Ball joint: housing + ball + rubber boot. Pivot at the ball centre. */
export function ballJoint(r = 0.026): Group {
  const g = new Group();
  const housing = mesh(new CylinderGeometry(r * 1.25, r * 1.25, r * 1.4, 18), MAT.steel());
  housing.position.y = -r * 0.9;
  const ball = mesh(new SphereGeometry(r * 0.85, 18, 12), MAT.chrome());
  const boot = mesh(new SphereGeometry(r * 1.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), MAT.boot());
  boot.position.y = -r * 0.2;
  const stud = mesh(rodGeometry(r * 0.38, r * 2.2), MAT.steel());
  g.add(housing, ball, boot, stud);
  return g;
}

/* ----------------------------------------------------------------------------
 * Coil spring with in-place length updates (no geometry reallocation per frame).
 * Spring axis is +Y from 0 to `length`; wire cross-section stays circular.
 * ------------------------------------------------------------------------- */
export class SpringGeometry extends BufferGeometry {
  private readonly segs: number;
  private readonly radial: number;
  constructor(
    public readonly coilRadius: number,
    public readonly wireRadius: number,
    public readonly turns: number,
    length: number,
    segsPerTurn = 28,
    radial = 8,
  ) {
    super();
    this.segs = Math.ceil(turns * segsPerTurn);
    this.radial = radial;
    const vCount = (this.segs + 1) * (radial + 1);
    this.setAttribute('position', new BufferAttribute(new Float32Array(vCount * 3), 3));
    this.setAttribute('normal', new BufferAttribute(new Float32Array(vCount * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < this.segs; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j;
        const b = (i + 1) * (radial + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    this.setIndex(idx);
    this.setLength(length);
  }

  setLength(length: number) {
    const L = Math.max(length, this.wireRadius * 2 * this.turns * 1.02);
    const pos = this.getAttribute('position') as BufferAttribute;
    const nor = this.getAttribute('normal') as BufferAttribute;
    const R = this.coilRadius;
    const w = this.turns * Math.PI * 2;
    const T = new Vector3();
    const N = new Vector3();
    const B = new Vector3();
    let k = 0;
    for (let i = 0; i <= this.segs; i++) {
      const t = i / this.segs;
      // Closed (ground) end coils: compress pitch near ends for a realistic look.
      const ease = t < 0.06 ? t * 0.55 : t > 0.94 ? 1 - (1 - t) * 0.55 : 0.033 + (t - 0.06) * (0.934 / 0.88);
      const yNorm = Math.min(1, Math.max(0, ease));
      const phi = w * t;
      const cx = R * Math.cos(phi);
      const cz = R * Math.sin(phi);
      const cy = this.wireRadius + yNorm * (L - 2 * this.wireRadius);
      T.set(-R * w * Math.sin(phi), L, R * w * Math.cos(phi)).normalize();
      N.set(-Math.cos(phi), 0, -Math.sin(phi));
      B.crossVectors(T, N).normalize();
      for (let j = 0; j <= this.radial; j++) {
        const th = (j / this.radial) * Math.PI * 2;
        const nx = Math.cos(th) * N.x + Math.sin(th) * B.x;
        const ny = Math.cos(th) * N.y + Math.sin(th) * B.y;
        const nz = Math.cos(th) * N.z + Math.sin(th) * B.z;
        pos.setXYZ(k, cx + this.wireRadius * nx, cy + this.wireRadius * ny, cz + this.wireRadius * nz);
        nor.setXYZ(k, nx, ny, nz);
        k++;
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
    this.computeBoundingSphere();
    this.computeBoundingBox();
  }
}

/* ----------------------------------------------------------------------------
 * Wheel & hub (axis along +X, centred at origin).
 * ------------------------------------------------------------------------- */
export function wheelGroup(radius = 0.31, width = 0.2): Group {
  const g = new Group();
  const rimR = radius * 0.68;
  const hw = width / 2;
  const profile = [
    new Vector2(rimR, -hw * 0.95),
    new Vector2(radius * 0.86, -hw),
    new Vector2(radius * 0.97, -hw * 0.88),
    new Vector2(radius, -hw * 0.55),
    new Vector2(radius, hw * 0.55),
    new Vector2(radius * 0.97, hw * 0.88),
    new Vector2(radius * 0.86, hw),
    new Vector2(rimR, hw * 0.95),
  ];
  const tire = mesh(new LatheGeometry(profile, 48), MAT.tire());
  (tire.material as MeshStandardMaterial).side = DoubleSide;
  tire.rotation.z = -Math.PI / 2;
  const barrel = mesh(new CylinderGeometry(rimR, rimR, width * 0.92, 40, 1, true), MAT.rim());
  (barrel.material as MeshStandardMaterial).side = DoubleSide;
  barrel.rotation.z = Math.PI / 2;
  const face = mesh(new CylinderGeometry(rimR * 0.32, rimR * 0.32, 0.03, 24), MAT.rim());
  face.rotation.z = Math.PI / 2;
  face.position.x = hw * 0.4;
  g.add(tire, barrel, face);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = mesh(new BoxGeometry(0.02, rimR * 0.72, 0.045), MAT.rim());
    spoke.position.set(hw * 0.4, Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62);
    spoke.rotation.x = -a;
    g.add(spoke);
  }
  return g;
}

export function hubGroup(): Group {
  const g = new Group();
  const flange = mesh(new CylinderGeometry(0.075, 0.075, 0.022, 28), MAT.hub());
  flange.rotation.z = Math.PI / 2;
  flange.position.x = 0.02;
  const bearing = mesh(new CylinderGeometry(0.05, 0.055, 0.06, 24), MAT.steel());
  bearing.rotation.z = Math.PI / 2;
  bearing.position.x = -0.02;
  g.add(flange, bearing);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const stud = mesh(new CylinderGeometry(0.006, 0.006, 0.04, 8), MAT.chrome());
    stud.rotation.z = Math.PI / 2;
    stud.position.set(0.045, Math.cos(a) * 0.05, Math.sin(a) * 0.05);
    g.add(stud);
  }
  return g;
}

/* ----------------------------------------------------------------------------
 * Pose helpers
 * ------------------------------------------------------------------------- */
/** Place an object (pivot-at-base, +Y axis) from a to b; optionally stretch Y to the distance. */
export function placeBetween(obj: Object3D, a: Vector3, b: Vector3, stretch = false) {
  obj.position.copy(a);
  tmpV.copy(b).sub(a);
  const len = tmpV.length();
  if (len > 1e-9) obj.quaternion.setFromUnitVectors(AY, tmpV.multiplyScalar(1 / len));
  if (stretch) obj.scale.set(1, len, 1);
  return len;
}

/** Group whose children are authored in design-world coords, re-origined at `pivot`. */
export function rigidBody(pivot: Vector3, build: (local: (p: Vector3) => Vector3) => Object3D[]): Group {
  const g = new Group();
  const local = (p: Vector3) => p.clone().sub(pivot);
  for (const o of build(local)) g.add(o);
  g.position.copy(pivot);
  return g;
}

export function axisQuat(axis: Vector3, angle: number, out = new Quaternion()) {
  return out.setFromAxisAngle(axis, angle);
}

export { AX, AY, AZ, tmpQ };
