import { BoxGeometry, Group, Quaternion, Vector3 } from 'three';
import { ModelBuilder, span, type PartSource } from '../rig/builder';
import { AX, RigidPose, solveRoot, v3 } from '../rig/math';
import { beam, bushing, MAT, mesh, rodGeometry } from '../rig/parts';
import type { RigFrame, Side, SuspensionModel } from '../rig/types';
import { cornerDamage } from '../sim/damageEffects';
import { addShock, addWheelAndHub, contextBox, poseRigid, SIDES, springPart } from './common';

/**
 * Torsion beam (twist-beam) rear axle. Both trailing arms pivot about a common lateral axis
 * through the front bushings; the cross beam between them twists when the arms rotate differently.
 * Corner-local coordinates for the right side (m). Illustrative proportions.
 */
export const TB = {
  pivot: v3(0.6, 0.36, 0.44),
  W: v3(0.76, 0.31, 0),
  beamZ: 0.22,
  beamY: 0.335,
  beamHalf: 0.6,
  springSeat: v3(0.5, 0.345, 0.08),
  springTop: v3(0.5, 0.62, 0.08),
  shockLower: v3(0.62, 0.25, -0.1),
  shockTop: v3(0.58, 0.72, -0.2),
};

const ARM0 = TB.W.clone().sub(TB.pivot);

/** Arm rotation α (about +X through the pivot) that places the wheel centre at the target height. */
export function solveTrailingArm(travel: number, pivot: Vector3) {
  const alpha = solveRoot((a) => {
    const y = pivot.y + ARM0.y * Math.cos(a) - ARM0.z * Math.sin(a);
    return y - (TB.W.y + travel);
  }, -0.6, 0.6);
  const pose = new RigidPose(pivot.clone(), new Quaternion().setFromAxisAngle(AX, alpha), TB.pivot.clone());
  return { alpha, pose, W: pose.apply(TB.W) };
}

export function buildTorsionBeam(source?: PartSource): SuspensionModel {
  const b = new ModelBuilder('torsion-beam', source);

  const arm = b.addPair('Trailing_Arm', 'trailing-arm', [0.14, -0.06, 0.06], () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(TB.pivot);
    const hubMount = v3(0.655, TB.W.y, 0.0);
    g.add(beam(L(v3(0.6, 0.36, 0.42)), L(v3(0.635, 0.33, 0.08)), 0.055, 0.075, MAT.arm()));
    g.add(beam(L(v3(0.635, 0.33, 0.1)), L(hubMount), 0.055, 0.08, MAT.arm()));
    g.add(beam(L(hubMount), L(TB.shockLower.clone().add(v3(0, 0.01, 0.02))), 0.035, 0.03, MAT.arm()));
    const plate = mesh(rodGeometry(0.07, 0.012, 24), MAT.arm());
    plate.rotation.z = -Math.PI / 2;
    plate.position.copy(L(hubMount));
    g.add(plate);
    const eye = mesh(rodGeometry(0.04, 0.07, 20), MAT.arm());
    eye.rotation.z = -Math.PI / 2;
    eye.position.copy(L(TB.pivot)).add(v3(-0.035, 0, 0));
    g.add(eye);
    // spring seat bracket
    g.add(beam(L(v3(0.61, 0.335, 0.08)), L(TB.springSeat.clone().add(v3(-0.02, -0.01, 0))), 0.07, 0.015, MAT.arm()));
    const seat = mesh(rodGeometry(0.07, 0.01, 28), MAT.steel());
    seat.position.copy(L(TB.springSeat));
    g.add(seat);
    g.position.copy(TB.pivot);
    return g;
  });
  const bush = b.addPair('Trailing_Arm_Bushing', 'lower-arm-bushing', [0.08, 0, 0.14], () => bushing(TB.pivot.clone(), AX, 0.036, 0.075));

  // Cross beam: segmented U-channel; each segment rotates about the common pivot axis by the
  // interpolated arm angle, which visualises the twist.
  const N = 14;
  const segW = (2 * TB.beamHalf) / N;
  const beamObj = b.add({ name: 'C_Torsion_Beam', componentId: 'torsion-beam', side: 'C', explode: [0, -0.05, 0.12] }, () => {
    const g = new Group();
    for (let i = 0; i < N; i++) {
      const seg = new Group();
      const x = -TB.beamHalf + (i + 0.5) * segW;
      const rel = v3(0, TB.beamY - TB.pivot.y, TB.beamZ - TB.pivot.z);
      const top = mesh(new BoxGeometry(segW + 0.002, 0.008, 0.11), MAT.axle());
      top.position.copy(rel).add(v3(0, 0.03, 0));
      const front = mesh(new BoxGeometry(segW + 0.002, 0.07, 0.008), MAT.axle());
      front.position.copy(rel).add(v3(0, 0, 0.055));
      const back = mesh(new BoxGeometry(segW + 0.002, 0.07, 0.008), MAT.axle());
      back.position.copy(rel).add(v3(0, 0, -0.055));
      const stripe = mesh(new BoxGeometry(segW + 0.002, 0.003, 0.012), MAT.barStripe());
      stripe.position.copy(rel).add(v3(0, 0.036, 0));
      seg.add(top, front, back, stripe);
      seg.position.set(x, TB.pivot.y, TB.pivot.z);
      seg.userData.u = (i + 0.5) / N;
      g.add(seg);
    }
    return g;
  });

  const spring = b.addPair('Coil_Spring', 'coil-spring', [0, 0.2, 0], () => springPart(0.065, 0.0095, 4.5));
  const shock = addShock(b, 'Shock_Absorber', [0.04, 0.26, -0.08], 0.25);
  const wheels = addWheelAndHub(b, TB.W);
  b.addPair('Body_Mounts', null, undefined, () => {
    const g = new Group();
    g.add(contextBox(TB.pivot.clone().add(v3(-0.02, 0.02, 0)), [0.09, 0.12, 0.1]));
    g.add(contextBox(TB.springTop.clone().add(v3(0, 0.02, 0)), [0.16, 0.04, 0.16]));
    g.add(contextBox(TB.shockTop.clone().add(v3(0, 0.02, 0)), [0.09, 0.04, 0.09]));
    return g;
  });

  return b.finish((f: RigFrame) => {
    const alpha = {} as Record<Side, number>;
    let wy = 0;
    for (const side of SIDES) {
      const dmg = cornerDamage(f.damage, f, side);
      const pivot = TB.pivot.clone().add(dmg.pivotOffset);
      const s = solveTrailingArm(f.travel[side], pivot);
      alpha[side] = s.alpha;
      poseRigid(arm[side], s.pose);
      bush[side].position.copy(pivot);
      wheels.pose(side, s.pose, f.wheelAngle, dmg.hubWobble);
      span(spring[side], s.pose.apply(TB.springSeat).add(v3(0, 0.006, 0)), TB.springTop);
      shock.pose(side, s.pose.apply(TB.shockLower), TB.shockTop);
      if (side === 'R') wy = s.W.y;
    }
    for (const seg of beamObj.children) {
      const u = seg.userData.u as number;
      seg.quaternion.setFromAxisAngle(AX, alpha.L * (1 - u) + alpha.R * u);
    }
    return { links: { wheelCenterYR: wy }, angles: { alphaL: alpha.L, alphaR: alpha.R, twist: alpha.R - alpha.L } };
  });
}
