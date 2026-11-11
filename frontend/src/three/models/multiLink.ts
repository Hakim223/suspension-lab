import { Group, Quaternion, Vector3 } from 'three';
import { ModelBuilder, span, type PartSource } from '../rig/builder';
import { AX, AZ, RigidPose, angleXY, circleIntersect, solveRoot, v3 } from '../rig/math';
import { beam, bushing, MAT, mesh, rodGeometry, segment } from '../rig/parts';
import type { RigFrame, Side, SuspensionModel } from '../rig/types';
import { cornerDamage } from '../sim/damageEffects';
import { addShock, addStabilizer, addWheelAndHub, contextBeam, contextBox, poseRigid, SIDES, springPart, unitRod } from './common';

/**
 * Simplified five-link rear suspension — right rear corner, corner-local coordinates (m).
 *
 * Kinematic simplification (documented): links are arranged so that, seen from the front,
 * the two upper links share one effective pivot line and the three lower links (spring link,
 * toe link, trailing link) share another. The hub carrier therefore moves in the front-view
 * plane like a short-long-arm suspension and EVERY link keeps an exactly constant length.
 * Real multi-link designs use non-parallel links to tune camber/toe change; that tuning is not modelled.
 */
export const ML = {
  AL: v3(0.26, 0.15), // lower effective pivot (front view)
  BL: v3(0.64, 0.12), // lower carrier joint (front view)
  AU: v3(0.36, 0.57),
  BU: v3(0.62, 0.56),
  W: v3(0.76, 0.31),
  lowerZ: -0.06, // spring link plane
  toeZ: 0.16, // toe link plane
  trailing: { carrierZ: 0.06, chassisZ: 0.55 },
  upper: [
    { chassisZ: 0.16, carrierZ: 0.05 },
    { chassisZ: -0.16, carrierZ: -0.06 },
  ],
  springSeat: v3(0.47, 0.147, -0.2),
  springTop: v3(0.46, 0.5, -0.2),
  shockLower: v3(0.63, 0.22, -0.12),
  shockTop: v3(0.57, 0.76, -0.17),
  K: v3(0.6, 0.165, 0.09),
  stab: { axisY: 0.35, axisZ: 0.36, cornerX: 0.4, bushingX: 0.32, E0: v3(0.58, 0.35, 0.09) },
};

const LL = ML.AL.distanceTo(ML.BL);
const LU = ML.AU.distanceTo(ML.BU);
const KH = ML.BL.distanceTo(ML.BU);
const TH_L0 = angleXY(ML.AL, ML.BL);
const KN0 = angleXY(ML.BL, ML.BU);
const qz = (a: number) => new Quaternion().setFromAxisAngle(AZ, a);

/** All links as (chassis point, carrier point in design pose). */
export const ML_LINKS = {
  toe: { chassis: ML.AL.clone().setZ(ML.toeZ), carrier: ML.BL.clone().setZ(ML.toeZ) },
  trailing: { chassis: ML.AL.clone().setZ(ML.trailing.chassisZ), carrier: ML.BL.clone().setZ(ML.trailing.carrierZ) },
  upperFront: { chassis: ML.AU.clone().setZ(ML.upper[0]!.chassisZ), carrier: ML.BU.clone().setZ(ML.upper[0]!.carrierZ) },
  upperRear: { chassis: ML.AU.clone().setZ(ML.upper[1]!.chassisZ), carrier: ML.BU.clone().setZ(ML.upper[1]!.carrierZ) },
};

export function solveMultiLink(travel: number, pivotOffset: Vector3) {
  const AL = ML.AL.clone().add(pivotOffset);
  const end = (th: number) => v3(AL.x + LL * Math.cos(th), AL.y + LL * Math.sin(th));
  const upper = (BL: Vector3) => circleIntersect(ML.AU, LU, BL, KH, true) ?? ML.BU.clone();
  const wheelY = (th: number) => {
    const BL = end(th);
    const BU = upper(BL);
    return BL.y + ML.W.clone().sub(ML.BL).applyQuaternion(qz(angleXY(BL, BU) - KN0)).y;
  };
  const theta = solveRoot((th) => wheelY(th) - (ML.W.y + travel), TH_L0 - 0.6, TH_L0 + 0.6);
  const BL = end(theta);
  const BU = upper(BL);
  const carrier = new RigidPose(BL.clone(), qz(angleXY(BL, BU) - KN0), ML.BL.clone());
  return { AL, theta, BL, BU, carrier, W: carrier.apply(ML.W) };
}

export function buildMultiLink(source?: PartSource): SuspensionModel {
  const b = new ModelBuilder('multi-link', source);

  const lowerArm = b.addPair('Lower_Arm', 'lower-control-arm', [0, -0.2, -0.06], () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(ML.AL);
    const a = ML.AL.clone().setZ(ML.lowerZ);
    const c = ML.BL.clone().setZ(ML.lowerZ);
    g.add(beam(L(a), L(c), 0.045, 0.03, MAT.arm()));
    // spring pan offset rearwards
    const panC = v3(ML.springSeat.x, ML.springSeat.y - 0.01, ML.springSeat.z);
    g.add(beam(L(v3(panC.x - 0.07, panC.y, ML.lowerZ)), L(v3(panC.x - 0.05, panC.y, panC.z)), 0.04, 0.02, MAT.arm()));
    g.add(beam(L(v3(panC.x + 0.07, panC.y - 0.004, ML.lowerZ)), L(v3(panC.x + 0.05, panC.y, panC.z)), 0.04, 0.02, MAT.arm()));
    const pan = mesh(rodGeometry(0.08, 0.012, 28), MAT.arm());
    pan.position.copy(L(panC));
    g.add(pan);
    g.position.copy(ML.AL);
    return g;
  });
  const toe = b.addPair('Toe_Link', 'multi-link-arms', [0, -0.12, 0.16], () => unitRod(0.012, MAT.arm()));
  const upF = b.addPair('Upper_Link_Front', 'multi-link-arms', [0, 0.2, 0.12], () => unitRod(0.013, MAT.arm()));
  const upR = b.addPair('Upper_Link_Rear', 'multi-link-arms', [0, 0.2, -0.12], () => unitRod(0.013, MAT.arm()));
  const trailing = b.addPair('Trailing_Link', 'trailing-arm', [0, -0.1, 0.3], () => unitRod(0.015, MAT.arm()));
  const bushes = b.addPair('Link_Bushings', 'lower-arm-bushing', [-0.06, 0, 0], () => {
    const g = new Group();
    for (let i = 0; i < 10; i++) {
      const bsh = bushing(new Vector3(), AX, 0.02, 0.035);
      g.add(bsh);
    }
    return g;
  });
  const carrier = b.addPair('Hub_Carrier', 'steering-knuckle', [0.18, 0, 0], () => {
    const g = new Group();
    const L = (p: Vector3) => p.clone().sub(ML.BL);
    const boss = v3(0.665, ML.W.y, 0);
    const spindle = mesh(rodGeometry(0.05, 0.06, 24), MAT.cast());
    spindle.rotation.z = -Math.PI / 2;
    spindle.position.copy(L(boss)).add(v3(-0.03, 0, 0));
    g.add(spindle);
    g.add(beam(L(v3(ML.BL.x, ML.BL.y + 0.01, 0)), L(boss), 0.05, 0.04, MAT.cast(), AZ));
    g.add(beam(L(boss), L(v3(ML.BU.x, ML.BU.y - 0.02, 0)), 0.05, 0.035, MAT.cast(), AZ));
    // fore/aft ears for the split links
    g.add(segment(L(ML.BU.clone().setZ(ML.upper[0]!.carrierZ)), L(ML.BU.clone().setZ(ML.upper[1]!.carrierZ)), 0.016, MAT.cast()));
    g.add(segment(L(ML.BL.clone().setZ(ML.toeZ)), L(ML.BL.clone().setZ(ML.lowerZ)), 0.018, MAT.cast()));
    g.add(segment(L(v3(0.645, 0.25, 0)), L(ML.shockLower), 0.015, MAT.cast()));
    g.add(segment(L(v3(0.645, 0.2, 0)), L(ML.K), 0.011, MAT.cast()));
    g.position.copy(ML.BL);
    return g;
  });
  const spring = b.addPair('Coil_Spring', 'coil-spring', [0, 0.18, -0.12], () => springPart(0.068, 0.0095, 4.5));
  const shock = addShock(b, 'Shock_Absorber', [0.05, 0.28, -0.1], 0.26);
  const wheels = addWheelAndHub(b, ML.W);
  const stab = addStabilizer(b, ML.stab, [0.04, 0, 0.2]);

  b.addPair('Subframe', null, undefined, () => {
    const g = new Group();
    g.add(contextBox(ML.springTop.clone().add(v3(0, 0.025, 0)), [0.18, 0.05, 0.18]));
    g.add(contextBox(ML.shockTop.clone().add(v3(0, 0.02, 0)), [0.1, 0.04, 0.1]));
    g.add(contextBeam(v3(0.3, 0.16, 0.6), v3(0.3, 0.16, -0.3), 0.07, 0.09));
    g.add(contextBeam(v3(0.34, 0.57, 0.22), v3(0.34, 0.57, -0.22), 0.06, 0.06));
    g.add(contextBeam(v3(0.3, 0.2, 0.0), v3(0.34, 0.54, 0.0), 0.06, 0.06));
    return g;
  });
  b.add({ name: 'C_Subframe', componentId: null, side: 'C' }, () => {
    const g = new Group();
    g.add(contextBeam(v3(-0.3, 0.16, 0.2), v3(0.3, 0.16, 0.2), 0.08, 0.07));
    g.add(contextBeam(v3(-0.3, 0.16, -0.22), v3(0.3, 0.16, -0.22), 0.08, 0.07));
    return g;
  });

  const nominal = stab.linkLen0(ML.K);

  return b.finish((f: RigFrame) => {
    const betas = {} as Record<Side, number>;
    const linkData = {} as Record<Side, { E: Vector3; K: Vector3; nominal: number }>;
    const lengths: Record<string, number> = {};
    for (const side of SIDES) {
      const dmg = cornerDamage(f.damage, f, side);
      const p = solveMultiLink(f.travel[side], dmg.pivotOffset);
      const qL = qz(p.theta - TH_L0);
      lowerArm[side].position.copy(p.AL);
      lowerArm[side].quaternion.copy(qL);
      poseRigid(carrier[side], p.carrier);
      wheels.pose(side, p.carrier, f.wheelAngle, dmg.hubWobble);

      const ends: Array<[Vector3, Vector3]> = [];
      const link = (obj: typeof toe.R, chassis: Vector3, carrier0: Vector3, name: string) => {
        const c = p.carrier.apply(carrier0);
        span(obj, chassis, c);
        ends.push([chassis, c]);
        if (side === 'R') lengths[name] = chassis.distanceTo(c);
      };
      link(toe[side], ML_LINKS.toe.chassis, ML_LINKS.toe.carrier, 'toe');
      link(trailing[side], ML_LINKS.trailing.chassis, ML_LINKS.trailing.carrier, 'trailing');
      link(upF[side], ML_LINKS.upperFront.chassis, ML_LINKS.upperFront.carrier, 'upperFront');
      link(upR[side], ML_LINKS.upperRear.chassis, ML_LINKS.upperRear.carrier, 'upperRear');
      const lowerCarrierEnd = p.BL.clone().setZ(ML.lowerZ);
      ends.push([p.AL.clone().setZ(ML.lowerZ), lowerCarrierEnd]);
      if (side === 'R') lengths.lower = p.AL.distanceTo(p.BL);
      const kids = bushes[side].children;
      ends.forEach(([a, c], i) => {
        kids[i * 2]?.position.copy(a);
        kids[i * 2 + 1]?.position.copy(c);
      });

      const armPose = new RigidPose(p.AL, qL, ML.AL.clone());
      span(spring[side], armPose.apply(ML.springSeat), ML.springTop);
      shock.pose(side, p.carrier.apply(ML.shockLower), ML.shockTop);
      const K = p.carrier.apply(ML.K);
      betas[side] = stab.solveBeta(K, nominal + dmg.linkPlay);
      linkData[side] = { E: stab.barEnd(betas[side]), K, nominal };
      if (side === 'R') lengths.wheelCenterY = p.W.y;
    }
    stab.pose(betas, linkData);
    return { links: lengths, angles: { betaL: betas.L, betaR: betas.R } };
  });
}
