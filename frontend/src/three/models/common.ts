import { BoxGeometry, Group, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { ModelBuilder, span } from '../rig/builder';
import { AX, AY, rotateAbout, solveRoot, v3, type RigidPose } from '../rig/math';
import { ballJoint, beam, bushing, hubGroup, MAT, mesh, rodGeometry, segment, sphere, SpringGeometry, wheelGroup } from '../rig/parts';
import type { Side } from '../rig/types';

export const SIDES: Side[] = ['L', 'R'];
export const WHEEL_RADIUS = 0.31;

/** Move a part that was authored in design pose so it follows a rigid body pose. */
export function poseRigid(obj: Object3D, pose: RigidPose) {
  obj.position.copy(pose.apply(obj.position));
  obj.quaternion.premultiply(pose.q);
}

/** Coil spring part (pivot at base, axis +Y). */
export function springPart(coilR: number, wireR: number, turns: number, len = 0.3) {
  const g = new SpringGeometry(coilR, wireR, turns, len);
  const m = mesh(g, MAT.spring());
  const holder = new Group();
  holder.add(m);
  holder.userData.spring = g;
  return holder;
}

/** Unit-length rod (pivot at base, +Y) that is stretched between two points by `span`. */
export function unitRod(r: number, material = MAT.steel()) {
  const g = new Group();
  g.add(mesh(rodGeometry(r, 1), material));
  return g;
}

/** Damper body (tube along +Y, length `len`) with seat plate at `seatAt`. */
export function damperBody(len: number, r: number, seatAt?: number) {
  const g = new Group();
  g.add(mesh(rodGeometry(r, len, 20), MAT.damper()));
  const cap = mesh(rodGeometry(r * 1.05, 0.012, 20), MAT.steel());
  cap.position.y = len - 0.006;
  g.add(cap);
  if (seatAt !== undefined) {
    const seat = mesh(rodGeometry(r * 3.1, 0.008, 28), MAT.steel());
    seat.position.y = seatAt;
    g.add(seat);
  }
  const eye = mesh(rodGeometry(r * 0.9, 0.03, 14), MAT.rubber());
  eye.rotation.z = Math.PI / 2;
  eye.position.set(-0.015, 0, 0);
  g.add(eye);
  return g;
}

/** A separate shock absorber spanning two mount points: body at the bottom, rod to the top. */
export function addShock(b: ModelBuilder, name: string, explode: [number, number, number], bodyLen = 0.26) {
  const body = b.addPair(`${name}_Body`, 'shock-absorber', explode, () => damperBody(bodyLen, 0.024));
  const rod = b.addPair(`${name}_Rod`, 'shock-absorber', explode, () => unitRod(0.009, MAT.chrome()));
  return {
    pose(side: Side, lower: Vector3, upper: Vector3) {
      const len = lower.distanceTo(upper);
      span(body[side], lower, upper, 'rigid');
      const top = lower.clone().lerp(upper, Math.min(0.92, bodyLen / len));
      span(rod[side], top, upper);
      return len;
    },
  };
}

/* ------------------------------------------------------------------------
 * Wheels & hubs
 * --------------------------------------------------------------------- */
export function addWheelAndHub(b: ModelBuilder, W0: Vector3) {
  const wheel = b.addPair('Wheel', 'wheel-assembly', [0.55, 0, 0], () => {
    const g = wheelGroup(WHEEL_RADIUS, 0.2);
    g.position.copy(W0);
    return g;
  });
  const hub = b.addPair('Wheel_Hub', 'wheel-hub', [0.32, 0, 0], () => {
    const g = hubGroup();
    g.position.copy(W0).add(v3(-0.065, 0, 0));
    return g;
  });
  return {
    pose(side: Side, pose: RigidPose, spin: number) {
      poseRigid(wheel[side], pose);
      wheel[side].quaternion.multiply(new Quaternion().setFromAxisAngle(AX, spin));
      poseRigid(hub[side], pose);
      hub[side].quaternion.multiply(new Quaternion().setFromAxisAngle(AX, spin));
    },
  };
}

/* ------------------------------------------------------------------------
 * Stabilizer bar: centre section twists between the two bar arms.
 * The bar rotates in its bushings about an axis parallel to X at (axisY, axisZ).
 * --------------------------------------------------------------------- */
export interface StabilizerGeo {
  axisY: number;
  axisZ: number;
  /** x of the bend where the bar arm leaves the centre section. */
  cornerX: number;
  /** x of the chassis bushings. */
  bushingX: number;
  /** Bar end (link top) in design pose, corner-local. */
  E0: Vector3;
}

export function addStabilizer(b: ModelBuilder, geo: StabilizerGeo, linkExplode: [number, number, number]) {
  const axisPt = v3(0, geo.axisY, geo.axisZ);
  const corner = v3(geo.cornerX, geo.axisY, geo.axisZ);
  const r = 0.012;
  const arms = b.addPair('Stabilizer_Arm', 'stabilizer-bar', [0, -0.02, 0.32], () => {
    const g = new Group();
    const local = (p: Vector3) => p.clone().sub(corner);
    g.add(segment(local(corner), local(geo.E0), r, MAT.bar()));
    g.add(sphere(local(corner), r, MAT.bar()));
    const eye = mesh(rodGeometry(r * 1.6, 0.02, 14), MAT.bar());
    eye.rotation.z = Math.PI / 2;
    eye.position.copy(local(geo.E0)).add(v3(-0.01, 0, 0));
    g.add(eye);
    g.position.copy(corner);
    return g;
  });
  const links = b.addPair('Stabilizer_Link', 'stabilizer-link', linkExplode, () => {
    const g = new Group();
    const L = 1;
    g.add(mesh(rodGeometry(0.0075, L, 10), MAT.steel()));
    return g;
  });
  const linkEnds = b.addPair('Stabilizer_Link_Joints', 'stabilizer-link', linkExplode, () => {
    const g = new Group();
    const top = ballJoint(0.012);
    const bottom = ballJoint(0.012);
    bottom.rotation.x = Math.PI;
    top.name = 'top';
    bottom.name = 'bottom';
    g.add(top, bottom);
    return g;
  });
  // Centre section: N segments each rotated by the interpolated twist angle; light stripe shows twist.
  const N = 12;
  const segLen = (2 * geo.cornerX) / N;
  const center = b.add({ name: 'C_Stabilizer_Bar', componentId: 'stabilizer-bar', side: 'C', explode: [0, -0.02, 0.32] }, () => {
    const g = new Group();
    for (let i = 0; i < N; i++) {
      const seg = new Group();
      const x0 = -geo.cornerX + i * segLen;
      const tube = mesh(rodGeometry(r, segLen + 0.001, 14), MAT.bar());
      tube.rotation.z = -Math.PI / 2;
      const stripe = new Mesh(new BoxGeometry(segLen + 0.001, 0.004, 0.006), MAT.barStripe());
      stripe.position.set(segLen / 2, r * 0.95, 0);
      seg.add(tube, stripe);
      seg.position.set(x0, geo.axisY, geo.axisZ);
      seg.userData.u = (i + 0.5) / N;
      g.add(seg);
    }
    for (const sx of [-1, 1]) {
      const bush = bushing(v3(sx * geo.bushingX, geo.axisY, geo.axisZ), AX, r * 2.2, 0.04);
      g.add(bush);
    }
    return g;
  });
  const linkLen0 = (K0: Vector3) => K0.distanceTo(geo.E0);

  return {
    linkLen0,
    /** Solve bar-arm rotation β so the link (length L) connects the bar end to K. */
    solveBeta(K: Vector3, L: number) {
      return solveRoot((beta) => rotateAbout(geo.E0, axisPt, AX, beta).distanceTo(K) - L, -1.2, 1.2);
    },
    barEnd(beta: number) {
      return rotateAbout(geo.E0, axisPt, AX, beta);
    },
    pose(beta: Record<Side, number>, links3: Record<Side, { E: Vector3; K: Vector3; nominal: number }>) {
      for (const side of SIDES) {
        arms[side].quaternion.setFromAxisAngle(AX, beta[side]);
        arms[side].position.copy(rotateAbout(corner, axisPt, AX, beta[side]));
        const { E, K, nominal } = links3[side];
        const dir = K.clone().sub(E).normalize();
        const top = E.clone().addScaledVector(dir, nominal);
        span(links[side], E, top);
        const joints = linkEnds[side];
        joints.getObjectByName('bottom')!.position.copy(E);
        joints.getObjectByName('top')!.position.copy(top);
      }
      // Left corner is mirrored in X; rotation about X is unaffected by an X-mirror, so β is shared.
      for (const seg of center.children) {
        if (seg.userData.u === undefined) continue;
        const u = seg.userData.u as number;
        const ang = beta.L * (1 - u) + beta.R * u;
        seg.quaternion.setFromAxisAngle(AX, ang);
      }
    },
  };
}

/* ------------------------------------------------------------------------
 * Rack & pinion steering with tie rods.
 * Rack displacement drives each knuckle; the knuckle steer angle is SOLVED so that the
 * tie-rod length stays constant (Ackermann and bump-steer emerge from geometry).
 * --------------------------------------------------------------------- */
export const RACK_TRAVEL = 0.07; // m each way (illustrative)

export function addSteering(b: ModelBuilder, I0: Vector3) {
  const housing = b.add({ name: 'C_Rack_Housing', componentId: 'rack-and-pinion', side: 'C', explode: [0, -0.04, -0.36] }, () => {
    const g = new Group();
    const len = 2 * I0.x - 0.12;
    const tube = mesh(rodGeometry(0.03, len, 20), MAT.rack());
    tube.rotation.z = -Math.PI / 2;
    tube.position.set(-len / 2, I0.y, I0.z);
    const pinion = mesh(rodGeometry(0.042, 0.1, 20), MAT.rack());
    pinion.position.set(-0.16, I0.y - 0.03, I0.z);
    const shaft = segment(v3(-0.16, I0.y + 0.06, I0.z), v3(-0.2, I0.y + 0.32, I0.z + 0.22), 0.011, MAT.steel());
    g.add(tube, pinion, shaft);
    for (const sx of [-1, 1]) {
      const boot = mesh(rodGeometry(0.034, 0.08, 16), MAT.boot());
      boot.rotation.z = -Math.PI / 2;
      boot.position.set(sx > 0 ? len / 2 : -len / 2 - 0.08, I0.y, I0.z);
      g.add(boot);
    }
    return g;
  });
  void housing;
  const rackBar = b.add({ name: 'C_Rack_Bar', componentId: 'rack-and-pinion', side: 'C', explode: [0, -0.04, -0.36] }, () => unitRod(0.014));
  const tieRods = b.addPair('Tie_Rod', 'tie-rod-end', [0.0, 0, -0.22], () => unitRod(0.011));
  const tieEnds = b.addPair('Tie_Rod_End', 'tie-rod-end', [0.08, 0, -0.22], () => {
    const g = ballJoint(0.017);
    return g;
  });
  return {
    /** Inner tie-rod point in corner-local coords for a world rack displacement (m). */
    innerPoint(side: Side, rackWorld: number) {
      const local = side === 'R' ? rackWorld : -rackWorld;
      return I0.clone().add(v3(local, 0, 0));
    },
    pose(rackWorld: number, ends: Record<Side, { I: Vector3; P: Vector3 }>) {
      const a = v3(-I0.x + rackWorld, I0.y, I0.z);
      const c = v3(I0.x + rackWorld, I0.y, I0.z);
      span(rackBar, a, c);
      for (const side of SIDES) {
        span(tieRods[side], ends[side].I, ends[side].P);
        tieEnds[side].position.copy(ends[side].P);
      }
    },
  };
}

/** Chassis mount bracket (non-selectable context). */
export function contextBox(center: Vector3, size: [number, number, number]) {
  const m = mesh(new BoxGeometry(...size), MAT.context());
  m.position.copy(center);
  m.castShadow = false;
  return m;
}

export function contextBeam(a: Vector3, c: Vector3, w = 0.06, h = 0.05) {
  const m = beam(a, c, w, h, MAT.context());
  m.castShadow = false;
  return m;
}

export { AY };
