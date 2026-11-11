import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { ModelBuilder, span, type PartSource } from '../rig/builder';
import { AX, AZ, RigidPose, solveRoot, v3 } from '../rig/math';
import { beam, bushing, MAT, mesh, rodGeometry, segment, sphere } from '../rig/parts';
import type { RigFrame, Side, SuspensionModel } from '../rig/types';
import { cornerDamage } from '../sim/damageEffects';
import { addShock, addWheelAndHub, contextBeam, contextBox, SIDES, springPart, unitRod } from './common';

/**
 * Rigid (solid) rear axle with coil springs, four trailing links and a Panhard (lateral) rod.
 * WORLD coordinates (axle spans both sides). Illustrative proportions.
 *
 * Kinematics:
 *  - heave: axle fore/aft position and pitch are solved so both link pairs keep their length;
 *  - roll: axle rotates about its centre by the left/right travel difference;
 *  - lateral: the Panhard rod length is held constant, which shifts the axle sideways slightly.
 * A 4-link + Panhard layout is over-constrained in roll; real vehicles absorb this with bushing
 * deflection. The model shows that as small link-length changes during roll (reported in `links`).
 */
export const RA = {
  C0: v3(0, 0.31, 0),
  halfTrack: 0.76,
  lower: { x: 0.52, chassis: v3(0, 0.3, 0.62), axle: v3(0, 0.22, 0) },
  upper: { x: 0.3, chassis: v3(0, 0.5, 0.42), axle: v3(0, 0.42, 0.04) },
  panhard: { chassis: v3(-0.56, 0.4, -0.14), axle: v3(0.5, 0.31, -0.14) },
  springSeat: v3(0.46, 0.36, 0),
  springTop: v3(0.46, 0.66, 0),
  shockLower: v3(0.6, 0.24, -0.1),
  shockTop: v3(0.54, 0.72, -0.22),
};

const LEN_LOWER = RA.lower.chassis.distanceTo(RA.lower.axle);
const LEN_UPPER = RA.upper.chassis.distanceTo(RA.upper.axle);
const LEN_PANHARD = RA.panhard.chassis.distanceTo(RA.panhard.axle);

/** Mirror a world point to left-corner local coords (corner_L has scale.x = -1). */
const mx = (p: Vector3) => v3(-p.x, p.y, p.z);

export function solveRigidAxle(hL: number, hR: number, pivotOffsetR = new Vector3()) {
  const yc = RA.C0.y + (hL + hR) / 2;
  const roll = Math.asin(Math.max(-0.3, Math.min(0.3, (hR - hL) / (2 * RA.halfTrack))));
  // Side-view (Y,Z) solve for fore/aft offset dz and pitch psi.
  const pt = (a: Vector3, dz: number, psi: number) => {
    const y = a.y - RA.C0.y;
    const z = a.z - RA.C0.z;
    return { y: yc + y * Math.cos(psi) - z * Math.sin(psi), z: dz + y * Math.sin(psi) + z * Math.cos(psi) };
  };
  const F = (dz: number, psi: number) => {
    const l = pt(RA.lower.axle, dz, psi);
    const u = pt(RA.upper.axle, dz, psi);
    return [
      Math.hypot(l.y - RA.lower.chassis.y, l.z - RA.lower.chassis.z) - LEN_LOWER,
      Math.hypot(u.y - RA.upper.chassis.y, u.z - RA.upper.chassis.z) - LEN_UPPER,
    ] as const;
  };
  let dz = 0;
  let psi = 0;
  for (let i = 0; i < 12; i++) {
    const f0 = F(dz, psi);
    if (Math.abs(f0[0]) + Math.abs(f0[1]) < 1e-10) break;
    const e = 1e-6;
    const fa = F(dz + e, psi);
    const fb = F(dz, psi + e);
    const j00 = (fa[0] - f0[0]) / e, j01 = (fb[0] - f0[0]) / e;
    const j10 = (fa[1] - f0[1]) / e, j11 = (fb[1] - f0[1]) / e;
    const det = j00 * j11 - j01 * j10;
    if (Math.abs(det) < 1e-12) break;
    dz -= (j11 * f0[0] - j01 * f0[1]) / det;
    psi -= (-j10 * f0[0] + j00 * f0[1]) / det;
  }
  const q = new Quaternion().setFromAxisAngle(AZ, roll).multiply(new Quaternion().setFromAxisAngle(AX, psi));
  const poseAt = (dx: number) => new RigidPose(v3(dx, yc, dz), q, RA.C0.clone());
  const dx = solveRoot((d) => poseAt(d).apply(RA.panhard.axle).distanceTo(RA.panhard.chassis) - LEN_PANHARD, -0.1, 0.1);
  const axle = poseAt(dx);
  void pivotOffsetR;
  return { axle, roll, psi, dz, dx };
}

export function buildRigidAxle(source?: PartSource): SuspensionModel {
  const b = new ModelBuilder('rigid-axle', source);

  const housing = b.add({ name: 'C_Axle_Housing', componentId: 'axle-housing', side: 'C', explode: [0, -0.06, 0] }, () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(RA.C0);
    const tube = mesh(rodGeometry(0.045, 1.36, 24), MAT.axle());
    tube.rotation.z = -Math.PI / 2;
    tube.position.copy(L(v3(-0.68, 0.31, 0)));
    const diff = mesh(rodGeometry(0.15, 0.16, 32), MAT.axle());
    diff.rotation.x = Math.PI / 2;
    diff.position.copy(L(v3(0.03, 0.31, 0.08)));
    const cover = sphere(L(v3(0.03, 0.31, -0.07)), 0.12, MAT.axle());
    cover.scale.z = 0.45;
    const pinion = mesh(rodGeometry(0.05, 0.14, 20), MAT.axle());
    pinion.rotation.x = Math.PI / 2;
    pinion.position.copy(L(v3(0.03, 0.31, 0.12)));
    g.add(tube, diff, cover, pinion);
    for (const sx of [-1, 1]) {
      // link brackets, spring seats, shock & panhard mounts
      g.add(segment(L(v3(sx * RA.lower.x, 0.31, 0)), L(v3(sx * RA.lower.x, RA.lower.axle.y, RA.lower.axle.z)), 0.02, MAT.axle()));
      g.add(segment(L(v3(sx * RA.upper.x, 0.31, 0)), L(v3(sx * RA.upper.x, RA.upper.axle.y, RA.upper.axle.z)), 0.018, MAT.axle()));
      const seat = mesh(rodGeometry(0.07, 0.01, 28), MAT.steel());
      seat.position.copy(L(v3(sx * RA.springSeat.x, RA.springSeat.y - 0.012, 0)));
      g.add(seat, segment(L(v3(sx * RA.springSeat.x, 0.31, 0)), L(v3(sx * RA.springSeat.x, RA.springSeat.y - 0.012, 0)), 0.03, MAT.axle()));
      g.add(beam(L(v3(sx * RA.shockLower.x, 0.31, 0)), L(v3(sx * RA.shockLower.x, RA.shockLower.y, RA.shockLower.z)), 0.03, 0.02, MAT.axle()));
    }
    g.add(beam(L(v3(RA.panhard.axle.x, 0.31, 0)), L(RA.panhard.axle), 0.03, 0.03, MAT.axle()));
    g.position.copy(RA.C0);
    return g;
  });
  const panhard = b.add({ name: 'C_Panhard_Rod', componentId: 'panhard-rod', side: 'C', explode: [0, 0, -0.3] }, () => unitRod(0.016, MAT.arm()));
  const panhardBush = b.add({ name: 'C_Panhard_Bushings', componentId: 'lower-arm-bushing', side: 'C', explode: [0, 0, -0.3] }, () => {
    const g = new Group();
    g.add(bushing(new Vector3(), AZ, 0.026, 0.05), bushing(new Vector3(), AZ, 0.026, 0.05));
    return g;
  });
  const lowerLink = b.addPair('Lower_Link', 'trailing-arm', [0.06, -0.12, 0.2], () => unitRod(0.02, MAT.arm()));
  const upperLink = b.addPair('Upper_Link', 'trailing-arm', [0.06, 0.12, 0.2], () => unitRod(0.016, MAT.arm()));
  const linkBush = b.addPair('Link_Bushings', 'lower-arm-bushing', [0.06, 0, 0.2], () => {
    const g = new Group();
    for (let i = 0; i < 4; i++) g.add(bushing(new Vector3(), AX, 0.024, 0.05));
    return g;
  });
  const spring = b.addPair('Coil_Spring', 'coil-spring', [0, 0.18, 0], () => springPart(0.068, 0.0105, 4.5));
  const shock = addShock(b, 'Shock_Absorber', [0.04, 0.26, -0.06], 0.25);
  const wheels = addWheelAndHub(b, v3(RA.halfTrack, RA.C0.y, 0));

  b.add({ name: 'C_Body_Mounts', componentId: null, side: 'C' }, () => {
    const g = new Group();
    for (const sx of [-1, 1]) {
      g.add(contextBeam(v3(sx * 0.48, 0.66, 0.8), v3(sx * 0.48, 0.66, -0.5), 0.07, 0.1));
      g.add(contextBox(v3(sx * RA.lower.x, RA.lower.chassis.y, RA.lower.chassis.z), [0.06, 0.1, 0.08]));
      g.add(contextBox(v3(sx * RA.upper.x, RA.upper.chassis.y + 0.02, RA.upper.chassis.z), [0.06, 0.1, 0.08]));
      g.add(contextBox(v3(sx * RA.springTop.x, RA.springTop.y + 0.02, 0), [0.16, 0.04, 0.16]));
      g.add(contextBox(v3(sx * RA.shockTop.x, RA.shockTop.y + 0.02, RA.shockTop.z), [0.09, 0.04, 0.09]));
    }
    g.add(contextBox(RA.panhard.chassis.clone().add(v3(0, 0.04, 0)), [0.08, 0.12, 0.06]));
    return g;
  });

  /** Pose an object that lives in a (possibly mirrored) corner using world points. */
  const local = (side: Side, p: Vector3) => (side === 'L' ? mx(p) : p.clone());
  const sideX = (side: Side) => (side === 'L' ? -1 : 1);

  return b.finish((f: RigFrame) => {
    const dmg = cornerDamage(f.damage, f, 'R');
    const s = solveRigidAxle(f.travel.L, f.travel.R);
    const { axle } = s;
    housing.position.copy(axle.apply(RA.C0));
    housing.quaternion.copy(axle.q);

    const lengths: Record<string, number> = {};
    for (const side of SIDES) {
      const sx = sideX(side);
      const W = axle.apply(v3(sx * RA.halfTrack, RA.C0.y, 0));
      // Wheel/hub pose in corner-local coordinates (mirror the world rotation for the left corner).
      const qLocal = side === 'L' ? new Quaternion(axle.q.x, -axle.q.y, -axle.q.z, axle.q.w) : axle.q.clone();
      const localPose = new RigidPose(local(side, W), qLocal, v3(RA.halfTrack, RA.C0.y, 0));
      wheels.pose(side, localPose, f.wheelAngle, side === 'R' ? dmg.hubWobble : 0);

      const off = side === 'R' ? dmg.pivotOffset : new Vector3();
      const lc = v3(sx * RA.lower.x, RA.lower.chassis.y, RA.lower.chassis.z).add(off);
      const la = axle.apply(v3(sx * RA.lower.x, RA.lower.axle.y, RA.lower.axle.z));
      const uc = v3(sx * RA.upper.x, RA.upper.chassis.y, RA.upper.chassis.z);
      const ua = axle.apply(v3(sx * RA.upper.x, RA.upper.axle.y, RA.upper.axle.z));
      span(lowerLink[side], local(side, lc), local(side, la));
      span(upperLink[side], local(side, uc), local(side, ua));
      const kids = linkBush[side].children;
      [lc, la, uc, ua].forEach((p, i) => kids[i]?.position.copy(local(side, p)));
      lengths[`lower${side}`] = lc.distanceTo(la);
      lengths[`upper${side}`] = uc.distanceTo(ua);

      span(spring[side], local(side, axle.apply(v3(sx * RA.springSeat.x, RA.springSeat.y, 0))), local(side, v3(sx * RA.springTop.x, RA.springTop.y, 0)));
      shock.pose(
        side,
        local(side, axle.apply(v3(sx * RA.shockLower.x, RA.shockLower.y, RA.shockLower.z))),
        local(side, v3(sx * RA.shockTop.x, RA.shockTop.y, RA.shockTop.z)),
      );
    }
    const pa = axle.apply(RA.panhard.axle);
    span(panhard, RA.panhard.chassis, pa);
    const pk = panhardBush.children as Object3D[];
    pk[0]?.position.copy(RA.panhard.chassis);
    pk[1]?.position.copy(pa);
    lengths.panhard = pa.distanceTo(RA.panhard.chassis);
    return { links: lengths, angles: { roll: s.roll, pitch: s.psi, lateralShift: s.dx, axleZ: s.dz, axleY: housing.position.y } };
  });
}

export const RA_CONSTANTS = { LEN_LOWER, LEN_UPPER, LEN_PANHARD };
