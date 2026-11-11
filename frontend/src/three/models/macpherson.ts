import { Group, Quaternion, Vector3 } from 'three';
import { ModelBuilder, span, type PartSource } from '../rig/builder';
import { AX, AY, AZ, RigidPose, angleXY, solveRoot, v3 } from '../rig/math';
import { ballJoint, beam, bushing, MAT, mesh, rodGeometry, segment, sphere } from '../rig/parts';
import type { RigFrame, Side, SuspensionModel } from '../rig/types';
import { cornerDamage, globalDamage, type CornerDamage } from '../sim/damageEffects';
import {
  addStabilizer,
  addSteering,
  addWheelAndHub,
  contextBeam,
  contextBox,
  damperBody,
  poseRigid,
  RACK_TRAVEL,
  SIDES,
  springPart,
  unitRod,
} from './common';

/**
 * MacPherson strut — right-hand front corner, corner-local coordinates (metres):
 * X = outboard, Y = up, Z = forward. Ground at Y = 0. Design (ride-height) pose.
 * Illustrative proportions, NOT a CAD model of any specific vehicle.
 */
export const MAC = {
  A: v3(0.3, 0.16), // lower-arm pivot axis (parallel to Z)
  bushZ: [0.1, -0.2] as const,
  B: v3(0.68, 0.13), // lower ball joint
  S: v3(0.63, 0.4), // strut clamp (bottom of strut, bolted to knuckle)
  T: v3(0.55, 0.98), // strut top mount
  W: v3(0.76, 0.31), // wheel centre
  P: v3(0.64, 0.24, -0.14), // steering arm / tie-rod end
  I: v3(0.3, 0.24, -0.14), // inner tie-rod (rack end) at centre rack position
  bodyLen: 0.32,
  springSeat: 0.26,
  stab: { axisY: 0.3, axisZ: 0.26, cornerX: 0.42, bushingX: 0.34, E0: v3(0.6, 0.3, 0.05) },
};

const u0 = MAC.T.clone().sub(MAC.S).normalize(); // strut axis (fixed in knuckle frame)
const K0 = MAC.S.clone().addScaledVector(u0, 0.17).setZ(0.05); // stabilizer-link bracket on strut
const LC = MAC.A.distanceTo(MAC.B); // lower arm planar length
const LTR = MAC.P.distanceTo(MAC.I); // tie-rod length
const LK = K0.distanceTo(MAC.stab.E0); // stabilizer link length
const THETA0 = angleXY(MAC.A, MAC.B);

export interface MacPose {
  A: Vector3;
  Barm: Vector3;
  Bk: Vector3;
  T: Vector3;
  theta: number;
  phi: number;
  delta: number;
  knuckle: RigidPose;
  W: Vector3;
  P: Vector3;
  Psolved: Vector3;
  I: Vector3;
  K: Vector3;
  /** Distance of T from the strut axis (should be ~0: strut passes through the top mount). */
  strutResidual: number;
}

const qz = (a: number) => new Quaternion().setFromAxisAngle(AZ, a);

/** Pure kinematic solve for one corner. `rackLocal` is rack displacement in corner-local X (m). */
export function solveMacPherson(travel: number, rackLocal: number, dmg: CornerDamage): MacPose {
  const A = MAC.A.clone().add(dmg.pivotOffset);
  const T = MAC.T.clone().add(dmg.mountOffset);

  // Knuckle in-plane rotation φ so that the strut axis (fixed in the knuckle) passes through T.
  const knucklePhi = (Bk: Vector3) =>
    solveRoot((phi) => {
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const dx = MAC.S.x - MAC.B.x;
      const dy = MAC.S.y - MAC.B.y;
      const Sx = Bk.x + c * dx - s * dy;
      const Sy = Bk.y + s * dx + c * dy;
      const ux = c * u0.x - s * u0.y;
      const uy = s * u0.x + c * u0.y;
      return ux * (T.y - Sy) - uy * (T.x - Sx);
    }, -0.6, 0.6);

  const armEnd = (theta: number) => v3(A.x + LC * Math.cos(theta), A.y + LC * Math.sin(theta), 0);
  const wheelY = (theta: number) => {
    const Bk = armEnd(theta).add(dmg.ballJointOffset);
    const phi = knucklePhi(Bk);
    const d = MAC.W.clone().sub(MAC.B).applyQuaternion(qz(phi));
    return Bk.y + d.y;
  };
  const theta = solveRoot((th) => wheelY(th) - (MAC.W.y + travel), THETA0 - 0.7, THETA0 + 0.7);
  const Barm = armEnd(theta);
  const Bk = Barm.clone().add(dmg.ballJointOffset);
  const phi = knucklePhi(Bk);
  const qPhi = qz(phi);

  // Steering: rotate the knuckle about the steering axis (lower ball joint -> top mount).
  const axis = T.clone().sub(Bk).normalize();
  const I = MAC.I.clone().add(v3(rackLocal, 0, 0));
  const poseFor = (delta: number) =>
    new RigidPose(Bk.clone(), new Quaternion().setFromAxisAngle(axis, delta).multiply(qPhi), MAC.B.clone());
  const delta = solveRoot((d) => poseFor(d).apply(MAC.P).distanceTo(I) - LTR, -0.75, 0.75);
  const Psolved = poseFor(delta).apply(MAC.P);
  const knuckle = poseFor(delta + dmg.toeWobble);

  const S = knuckle.apply(MAC.S);
  const u = u0.clone().applyQuaternion(knuckle.q);
  const toT = T.clone().sub(S);
  const strutResidual = toT.clone().sub(u.clone().multiplyScalar(toT.dot(u))).length();

  return {
    A,
    Barm,
    Bk,
    T,
    theta,
    phi,
    delta,
    knuckle,
    W: knuckle.apply(MAC.W),
    P: knuckle.apply(MAC.P),
    Psolved,
    I,
    K: knuckle.apply(K0),
    strutResidual,
  };
}

export function buildMacPherson(source?: PartSource): SuspensionModel {
  const b = new ModelBuilder('macpherson', source);

  // ---- Corner parts (both sides) ----
  const lowerArm = b.addPair('Lower_Arm', 'lower-control-arm', [0, -0.2, 0], () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(MAC.A);
    const fr = v3(MAC.A.x, MAC.A.y, MAC.bushZ[0]);
    const rr = v3(MAC.A.x, MAC.A.y, MAC.bushZ[1]);
    const nearB = v3(MAC.B.x - 0.03, MAC.B.y + 0.005, 0);
    g.add(beam(L(fr), L(nearB), 0.05, 0.028, MAT.arm()));
    g.add(beam(L(rr), L(v3(0.56, 0.142, -0.02)), 0.05, 0.028, MAT.arm()));
    g.add(beam(L(v3(0.56, 0.142, -0.02)), L(nearB), 0.05, 0.028, MAT.arm()));
    g.add(segment(L(fr.clone().setZ(fr.z + 0.025)), L(fr.clone().setZ(fr.z - 0.025)), 0.03, MAT.arm()));
    g.position.copy(MAC.A);
    return g;
  });
  const armBushings = b.addPair('Lower_Arm_Bushings', 'lower-arm-bushing', [-0.1, -0.2, 0], () => {
    const g = new Group();
    for (const z of MAC.bushZ) g.add(bushing(v3(0, 0, z), AZ, 0.028, 0.05));
    g.position.copy(MAC.A);
    return g;
  });
  const balljoint = b.addPair('Ball_Joint', 'ball-joint', [0.1, -0.13, 0], () => {
    const g = ballJoint(0.024);
    g.position.copy(MAC.B);
    return g;
  });
  const knuckle = b.addPair('Knuckle', 'steering-knuckle', [0.16, 0, 0], () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(MAC.B);
    const boss = v3(0.665, MAC.W.y, 0);
    const spindle = mesh(rodGeometry(0.05, 0.06, 24), MAT.cast());
    spindle.rotation.z = -Math.PI / 2;
    spindle.position.copy(L(boss)).add(v3(-0.03, 0, 0));
    g.add(spindle);
    g.add(beam(L(v3(0.67, MAC.B.y + 0.02)), L(boss), 0.05, 0.035, MAT.cast(), AZ));
    g.add(beam(L(boss), L(MAC.S), 0.05, 0.035, MAT.cast(), AZ));
    g.add(segment(L(v3(0.655, 0.27, -0.03)), L(MAC.P), 0.015, MAT.cast()));
    const clamp = mesh(rodGeometry(0.034, 0.09, 20), MAT.cast());
    clamp.position.copy(L(MAC.S));
    clamp.quaternion.setFromUnitVectors(AY, u0);
    g.add(clamp);
    g.position.copy(MAC.B);
    return g;
  });
  const strutBody = b.addPair('Shock_Absorber', 'shock-absorber', [0.05, 0.1, 0], () => {
    const g = damperBody(MAC.bodyLen, 0.027, MAC.springSeat);
    const bracket = segment(v3(0, 0.17, 0.0), v3(0.0, 0.17, 0.05), 0.008, MAT.steel());
    g.add(bracket);
    g.position.copy(MAC.S);
    g.quaternion.setFromUnitVectors(AY, u0);
    return g;
  });
  const rod = b.addPair('Piston_Rod', 'shock-absorber', [0.05, 0.18, 0], () => unitRod(0.011, MAT.chrome()));
  const spring = b.addPair('Coil_Spring', 'coil-spring', [0.08, 0.3, 0], () => springPart(0.075, 0.0105, 5.5));
  const mount = b.addPair('Strut_Mount', 'strut-mount', [0.05, 0.5, 0], () => {
    const g = new Group();
    const plate = mesh(rodGeometry(0.095, 0.012, 32), MAT.steel());
    plate.position.y = 0.01;
    const rubber = mesh(rodGeometry(0.075, 0.05, 28), MAT.rubber());
    rubber.position.y = -0.035;
    rubber.name = 'rubber';
    const bearing = mesh(rodGeometry(0.084, 0.012, 28), MAT.chrome());
    bearing.position.y = -0.05;
    const seat = mesh(rodGeometry(0.088, 0.008, 28), MAT.steel());
    seat.position.y = -0.062;
    g.add(plate, rubber, bearing, seat);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const stud = mesh(rodGeometry(0.005, 0.04), MAT.chrome());
      stud.position.set(Math.cos(a) * 0.07, 0.015, Math.sin(a) * 0.07);
      g.add(stud);
    }
    g.position.copy(MAC.T);
    g.quaternion.setFromUnitVectors(AY, u0);
    return g;
  });

  const wheels = addWheelAndHub(b, MAC.W);
  const steering = addSteering(b, MAC.I);
  const stab = addStabilizer(b, MAC.stab, [0.04, 0, 0.24]);

  // ---- Context (non-selectable chassis) ----
  b.addPair('Strut_Tower', null, undefined, () => contextBox(v3(MAC.T.x - 0.02, MAC.T.y + 0.05, 0), [0.26, 0.04, 0.28]));
  b.addPair('Arm_Brackets', null, undefined, () => {
    const g = new Group();
    for (const z of MAC.bushZ) g.add(contextBox(v3(MAC.A.x - 0.03, MAC.A.y, z), [0.07, 0.08, 0.07]));
    return g;
  });
  b.add({ name: 'C_Subframe', componentId: null, side: 'C' }, () => {
    const g = new Group();
    g.add(contextBeam(v3(-0.27, MAC.A.y + 0.01, 0.1), v3(0.27, MAC.A.y + 0.01, 0.1), 0.08, 0.06));
    g.add(contextBeam(v3(-0.27, MAC.A.y + 0.01, -0.2), v3(0.27, MAC.A.y + 0.01, -0.2), 0.08, 0.06));
    for (const sx of [-1, 1]) g.add(contextBeam(v3(sx * 0.27, MAC.A.y + 0.01, 0.12), v3(sx * 0.27, MAC.A.y + 0.01, -0.24), 0.06, 0.06));
    return g;
  });

  const yAxis = new Vector3();
  let lastPose: Record<Side, MacPose> | null = null;

  return b.finish((f: RigFrame) => {
    const rackWorld = f.rack * RACK_TRAVEL + globalDamage(f.damage, f).rackOffset;
    const poses = {} as Record<Side, MacPose>;
    const betas = {} as Record<Side, number>;
    const linkData = {} as Record<Side, { E: Vector3; K: Vector3; nominal: number }>;
    const ends = {} as Record<Side, { I: Vector3; P: Vector3 }>;
    for (const side of SIDES) {
      const dmg = cornerDamage(f.damage, f, side);
      const I = steering.innerPoint(side, rackWorld);
      const p = solveMacPherson(f.travel[side], I.x - MAC.I.x, dmg);
      poses[side] = p;

      lowerArm[side].position.copy(p.A);
      lowerArm[side].quaternion.copy(qz(p.theta - THETA0));
      armBushings[side].position.copy(p.A);
      armBushings[side].quaternion.copy(qz(p.theta - THETA0));
      balljoint[side].position.copy(p.Barm);
      poseRigid(knuckle[side], p.knuckle);
      poseRigid(strutBody[side], p.knuckle);

      const S = p.knuckle.apply(MAC.S);
      yAxis.copy(p.T).sub(S).normalize();
      const bodyTop = S.clone().addScaledVector(yAxis, MAC.bodyLen);
      span(rod[side], bodyTop, p.T);
      span(spring[side], S.clone().addScaledVector(yAxis, MAC.springSeat + 0.008), p.T.clone().addScaledVector(yAxis, -0.062));
      mount[side].position.copy(p.T);
      if (dmg.mountSquash > 0) {
        const rubber = mount[side].getObjectByName('rubber');
        if (rubber) rubber.scale.y = 1 - 0.45 * dmg.mountSquash;
      }
      wheels.pose(side, p.knuckle, f.wheelAngle, dmg.hubWobble);
      ends[side] = { I: p.I, P: p.Psolved };

      const nominal = stab.linkLen0(K0);
      betas[side] = stab.solveBeta(p.K, nominal + dmg.linkPlay);
      linkData[side] = { E: stab.barEnd(betas[side]), K: p.K, nominal };
    }
    steering.pose(rackWorld, ends);
    stab.pose(betas, linkData);
    lastPose = poses;
    return {
      links: {
        lowerArmR: poses.R.Barm.distanceTo(poses.R.A),
        tieRodR: poses.R.Psolved.distanceTo(poses.R.I),
        lowerArmL: poses.L.Barm.distanceTo(poses.L.A),
        tieRodL: poses.L.Psolved.distanceTo(poses.L.I),
        strutResidualR: poses.R.strutResidual,
        strutResidualL: poses.L.strutResidual,
        stabLinkR: linkData.R.E.distanceTo(linkData.R.K),
      },
      angles: { steerR: poses.R.delta, steerL: poses.L.delta, betaL: betas.L, betaR: betas.R, wheelCenterYR: poses.R.W.y },
    };
    void lastPose;
  });
}

export const MAC_CONSTANTS = { LC, LTR, LK, THETA0, AX, sphere };
