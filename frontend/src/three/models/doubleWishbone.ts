import { Group, Quaternion, Vector3 } from 'three';
import { ModelBuilder, span, type PartSource } from '../rig/builder';
import { AY, AZ, RigidPose, angleXY, circleIntersect, solveRoot, v3 } from '../rig/math';
import { ballJoint, beam, bushing, MAT, mesh, rodGeometry, segment } from '../rig/parts';
import type { RigFrame, Side, SuspensionModel } from '../rig/types';
import { cornerDamage, globalDamage, type CornerDamage } from '../sim/damageEffects';
import {
  addShock,
  addStabilizer,
  addSteering,
  addWheelAndHub,
  contextBeam,
  contextBox,
  poseRigid,
  RACK_TRAVEL,
  SIDES,
  springPart,
} from './common';

/**
 * Double wishbone (short-long arm) — right front corner, corner-local coordinates (m).
 * The knuckle is located by two ball joints; spring & damper sit between lower arm and chassis.
 * Illustrative proportions, not a CAD model.
 */
export const DW = {
  AL: v3(0.26, 0.14), // lower arm pivot axis (∥Z)
  lowerBushZ: [0.12, -0.16] as const,
  BL: v3(0.69, 0.12), // lower ball joint
  AU: v3(0.34, 0.62), // upper arm pivot axis (∥Z)
  upperBushZ: [0.15, -0.15] as const,
  BU: v3(0.58, 0.6), // upper ball joint
  W: v3(0.76, 0.31),
  P: v3(0.63, 0.2, -0.15),
  I: v3(0.3, 0.2, -0.15),
  springSeatFrac: 0.6, // along lower arm from AL
  springTop: v3(0.47, 0.5), // chassis spring pocket
  shockTop: v3(0.45, 0.82), // chassis shock mount (shock passes through the upper arm opening)
  linkFrac: 0.78,
  linkZ: 0.08,
  stab: { axisY: 0.36, axisZ: 0.28, cornerX: 0.4, bushingX: 0.32, E0: v3(0.6, 0.36, 0.08) },
};

const LL = DW.AL.distanceTo(DW.BL);
const LU = DW.AU.distanceTo(DW.BU);
const KH = DW.BL.distanceTo(DW.BU); // knuckle ball-joint spacing
const TH_L0 = angleXY(DW.AL, DW.BL);
const TH_U0 = angleXY(DW.AU, DW.BU);
const LTR = DW.P.distanceTo(DW.I);
const KN_ANG0 = angleXY(DW.BL, DW.BU);
const M0 = DW.AL.clone().lerp(DW.BL, DW.springSeatFrac); // spring/shock seat on lower arm
const K0 = DW.AL.clone().lerp(DW.BL, DW.linkFrac).setZ(DW.linkZ); // stab link mount on lower arm

const qz = (a: number) => new Quaternion().setFromAxisAngle(AZ, a);

export interface DwPose {
  AL: Vector3;
  thetaL: number;
  thetaU: number;
  BLarm: Vector3;
  BLk: Vector3;
  BU: Vector3;
  AU: Vector3;
  BUarm: Vector3;
  knuckle: RigidPose;
  delta: number;
  W: Vector3;
  Psolved: Vector3;
  I: Vector3;
  knuckleSpan: number;
}

/** Pure kinematic solve: lower-arm angle from wheel travel, upper joint via circle intersection. */
export function solveDoubleWishbone(travel: number, rackLocal: number, dmg: CornerDamage): DwPose {
  const AL = DW.AL.clone().add(dmg.pivotOffset);
  const lowerEnd = (th: number) => v3(AL.x + LL * Math.cos(th), AL.y + LL * Math.sin(th));
  const AU = DW.AU.clone().add(dmg.upperPivotOffset);
  // Upper joint on the ARM (circle intersection keeps both arm lengths and the knuckle span).
  const upperOnArm = (BLk: Vector3) => circleIntersect(AU, LU, BLk, KH, true) ?? DW.BU.clone();
  // With upper ball-joint play the knuckle's top is displaced relative to the arm end.
  const solveUpper = (BLk: Vector3) => upperOnArm(BLk).add(dmg.upperBallJointOffset);
  const knucklePhi = (BLk: Vector3, BU: Vector3) => angleXY(BLk, BU) - KN_ANG0;
  const wheelY = (th: number) => {
    const BLk = lowerEnd(th).add(dmg.ballJointOffset);
    const BU = solveUpper(BLk);
    const d = DW.W.clone().sub(DW.BL).applyQuaternion(qz(knucklePhi(BLk, BU)));
    return BLk.y + d.y;
  };
  const thetaL = solveRoot((th) => wheelY(th) - (DW.W.y + travel), TH_L0 - 0.6, TH_L0 + 0.6);
  const BLarm = lowerEnd(thetaL);
  const BLk = BLarm.clone().add(dmg.ballJointOffset);
  const BU = solveUpper(BLk);
  const qPhi = qz(knucklePhi(BLk, BU));
  const axis = BU.clone().sub(BLk).normalize();
  const I = DW.I.clone().add(v3(rackLocal, 0, 0));
  const poseFor = (d: number) => new RigidPose(BLk.clone(), new Quaternion().setFromAxisAngle(axis, d).multiply(qPhi), DW.BL.clone());
  const delta = solveRoot((d) => poseFor(d).apply(DW.P).distanceTo(I) - LTR, -0.75, 0.75);
  const knuckle = poseFor(delta + dmg.toeWobble);
  return {
    AL,
    thetaL,
    thetaU: angleXY(AU, upperOnArm(BLk)),
    AU,
    BUarm: upperOnArm(BLk),
    BLarm,
    BLk,
    BU,
    knuckle,
    delta,
    W: knuckle.apply(DW.W),
    Psolved: poseFor(delta).apply(DW.P),
    I,
    knuckleSpan: BLk.distanceTo(BU),
  };
}

function aArm(pivot: Vector3, bushZ: readonly [number, number], tip: Vector3, w: number, h: number) {
  const g = new Group();
  const L = (p: Vector3) => p.clone().sub(pivot);
  const f = v3(pivot.x, pivot.y, bushZ[0]);
  const r = v3(pivot.x, pivot.y, bushZ[1]);
  const t = v3(tip.x - 0.025, tip.y + 0.004, 0);
  g.add(beam(L(f), L(t), w, h, MAT.arm()));
  g.add(beam(L(r), L(t), w, h, MAT.arm()));
  return g;
}

export function buildDoubleWishbone(source?: PartSource): SuspensionModel {
  const b = new ModelBuilder('double-wishbone', source);

  const lowerArm = b.addPair('Lower_Arm', 'lower-control-arm', [0, -0.22, 0], () => {
    const g = aArm(DW.AL, DW.lowerBushZ, DW.BL, 0.045, 0.028);
    const L = (p: Vector3) => p.clone().sub(DW.AL);
    // spring seat plate & stabilizer-link tab
    const seat = mesh(rodGeometry(0.07, 0.008, 28), MAT.steel());
    seat.position.copy(L(M0)).add(v3(0, 0.012, 0));
    g.add(seat, beam(L(M0.clone().setZ(0.07)), L(M0.clone().setZ(-0.07)), 0.04, 0.02, MAT.arm()));
    g.add(segment(L(K0.clone().setZ(0.02)), L(K0), 0.008, MAT.steel()));
    g.position.copy(DW.AL);
    return g;
  });
  const upperArm = b.addPair('Upper_Arm', 'upper-control-arm', [0, 0.24, 0], () => {
    const g = aArm(DW.AU, DW.upperBushZ, DW.BU, 0.04, 0.024);
    g.position.copy(DW.AU);
    return g;
  });
  const lowerBushings = b.addPair('Lower_Arm_Bushings', 'lower-arm-bushing', [-0.1, -0.22, 0], () => {
    const g = new Group();
    for (const z of DW.lowerBushZ) g.add(bushing(v3(DW.AL.x, DW.AL.y, z), AZ, 0.026, 0.05));
    return g;
  });
  const upperBushings = b.addPair('Upper_Arm_Bushings', 'lower-arm-bushing', [-0.1, 0.24, 0], () => {
    const g = new Group();
    for (const z of DW.upperBushZ) g.add(bushing(v3(DW.AU.x, DW.AU.y, z), AZ, 0.022, 0.045));
    return g;
  });
  const bjLower = b.addPair('Lower_Ball_Joint', 'ball-joint', [0.1, -0.14, 0], () => {
    const g = ballJoint(0.024);
    g.position.copy(DW.BL);
    return g;
  });
  const bjUpper = b.addPair('Upper_Ball_Joint', 'ball-joint', [0.1, 0.14, 0], () => {
    const g = ballJoint(0.02);
    g.rotation.x = Math.PI;
    g.position.copy(DW.BU);
    return g;
  });
  const knuckle = b.addPair('Knuckle', 'steering-knuckle', [0.18, 0, 0], () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(DW.BL);
    const boss = v3(0.665, DW.W.y, 0);
    const spindle = mesh(rodGeometry(0.05, 0.06, 24), MAT.cast());
    spindle.rotation.z = -Math.PI / 2;
    spindle.position.copy(L(boss)).add(v3(-0.03, 0, 0));
    g.add(spindle);
    g.add(beam(L(v3(DW.BL.x - 0.01, DW.BL.y + 0.02)), L(boss), 0.05, 0.035, MAT.cast(), AZ));
    g.add(beam(L(boss), L(v3(0.6, 0.5)), 0.045, 0.032, MAT.cast(), AZ));
    g.add(beam(L(v3(0.6, 0.5)), L(v3(DW.BU.x + 0.005, DW.BU.y - 0.025)), 0.04, 0.03, MAT.cast(), AZ));
    g.add(segment(L(v3(0.655, 0.25, -0.03)), L(DW.P), 0.015, MAT.cast()));
    g.position.copy(DW.BL);
    return g;
  });
  const spring = b.addPair('Coil_Spring', 'coil-spring', [0.04, 0.16, 0], () => springPart(0.062, 0.0095, 5));
  const shock = addShock(b, 'Shock_Absorber', [0.04, 0.3, 0], 0.26);
  const wheels = addWheelAndHub(b, DW.W);
  const steering = addSteering(b, DW.I);
  const stab = addStabilizer(b, DW.stab, [0.04, 0, 0.24]);

  // Context: frame rail, spring pocket, shock tower, arm brackets
  b.addPair('Frame', null, undefined, () => {
    const g = new Group();
    g.add(contextBox(v3(DW.springTop.x, DW.springTop.y + 0.025, 0), [0.17, 0.05, 0.17]));
    g.add(contextBox(v3(DW.shockTop.x, DW.shockTop.y + 0.02, 0), [0.12, 0.04, 0.12]));
    g.add(contextBeam(v3(DW.springTop.x - 0.06, DW.springTop.y + 0.03, 0), v3(DW.shockTop.x - 0.05, DW.shockTop.y + 0.02, 0), 0.06, 0.04));
    for (const z of DW.lowerBushZ) g.add(contextBox(v3(DW.AL.x - 0.03, DW.AL.y, z), [0.07, 0.08, 0.07]));
    for (const z of DW.upperBushZ) g.add(contextBox(v3(DW.AU.x - 0.03, DW.AU.y, z), [0.06, 0.07, 0.06]));
    g.add(contextBeam(v3(0.3, DW.AL.y, 0.32), v3(0.3, DW.AL.y, -0.32), 0.07, 0.1));
    return g;
  });
  b.add({ name: 'C_Crossmember', componentId: null, side: 'C' }, () => contextBeam(v3(-0.3, DW.AL.y, 0), v3(0.3, DW.AL.y, 0), 0.1, 0.08));

  return b.finish((f: RigFrame) => {
    const rackWorld = f.rack * RACK_TRAVEL + globalDamage(f.damage, f).rackOffset;
    const poses = {} as Record<Side, DwPose>;
    const betas = {} as Record<Side, number>;
    const linkData = {} as Record<Side, { E: Vector3; K: Vector3; nominal: number }>;
    const ends = {} as Record<Side, { I: Vector3; P: Vector3 }>;
    const nominal = stab.linkLen0(K0);
    for (const side of SIDES) {
      const dmg = cornerDamage(f.damage, f, side);
      const I = steering.innerPoint(side, rackWorld);
      const p = solveDoubleWishbone(f.travel[side], I.x - DW.I.x, dmg);
      poses[side] = p;
      const qL = qz(p.thetaL - TH_L0);
      lowerArm[side].position.copy(p.AL);
      lowerArm[side].quaternion.copy(qL);
      lowerBushings[side].position.copy(dmg.pivotOffset);
      upperArm[side].position.copy(p.AU);
      upperArm[side].quaternion.copy(qz(p.thetaU - TH_U0));
      upperBushings[side].position.copy(dmg.upperPivotOffset);
      bjLower[side].position.copy(p.BLarm);
      bjUpper[side].position.copy(p.BUarm);
      poseRigid(knuckle[side], p.knuckle);
      wheels.pose(side, p.knuckle, f.wheelAngle, dmg.hubWobble);
      const armPose = new RigidPose(p.AL, qL, DW.AL.clone());
      const seat = armPose.apply(M0).add(v3(0, 0.02, 0));
      span(spring[side], seat, DW.springTop);
      shock.pose(side, armPose.apply(M0).add(v3(0, 0.005, 0)), DW.shockTop);
      ends[side] = { I: p.I, P: p.Psolved };
      const K = armPose.apply(K0);
      betas[side] = stab.solveBeta(K, nominal + dmg.linkPlay);
      linkData[side] = { E: stab.barEnd(betas[side]), K, nominal };
    }
    steering.pose(rackWorld, ends);
    stab.pose(betas, linkData);
    return {
      links: {
        lowerArmR: poses.R.BLarm.distanceTo(poses.R.AL),
        upperArmR: poses.R.BUarm.distanceTo(poses.R.AU),
        knuckleSpanR: poses.R.knuckleSpan,
        tieRodR: poses.R.Psolved.distanceTo(poses.R.I),
        tieRodL: poses.L.Psolved.distanceTo(poses.L.I),
        stabLinkR: linkData.R.E.distanceTo(linkData.R.K),
      },
      angles: { steerR: poses.R.delta, steerL: poses.L.delta, wheelCenterYR: poses.R.W.y, betaL: betas.L, betaR: betas.R },
    };
  });
}

export const DW_CONSTANTS = { LL, LU, KH, LTR, AY };
