import type { SteeringFaultModel, SteeringSystemId } from '../data/types';

/**
 * Simplified quasi-static steering-effort model (teaching aid, not a validated vehicle model).
 *
 *  rack travel   = 50 mm per steering-wheel revolution  → pinion pitch radius r ≈ 7.96 mm
 *  overall ratio ≈ 15.4 : 1 (540° lock = 35° road wheel)
 *  rack load     = tyre scrub at parking (fades with speed) + aligning load (caster/trail) + friction
 *  driver force  = T_driver / r
 *  HPS assist    = p(T_driver) · A_piston,  p = boost curve of the rotary valve (max ≈ 9 MPa)
 *  EPS assist    = G(v) · T_sensed (+ saturation), T_sensed = T_driver + sensor offset
 *
 * Faults (SteeringFaultModel) modify free play, friction, available pressure/assist, bias and return.
 */

export const PINION_RADIUS_M = 0.05 / (2 * Math.PI);
export const MAX_SW_DEG = 540;
export const MAX_ROAD_DEG = 35;
export const RACK_MM_PER_SW_DEG = 50 / 360;
const BASE_FRICTION_N = 280;
const PARK_LOAD_N = 6500;
const ALIGN_LOAD_N = 4200;
const PISTON_AREA_M2 = 7e-4;
const P_MAX_MPA = 9;
const EPS_MAX_ASSIST_NM = 70;

export interface SteeringInput {
  system: SteeringSystemId;
  /** Steering-wheel angle actually transmitted to the pinion (after free play), degrees. */
  swDeg: number;
  /** +1 steering away from centre (loading), -1 returning. */
  direction: 1 | -1;
  speedKmh: number;
  rpm: number;
  fault: SteeringFaultModel;
}

export interface SteeringOutput {
  roadWheelDeg: number;
  rackMm: number;
  rackLoadN: number;
  driverTorqueNm: number;
  assistForceN: number;
  /** 0..1 share of the rack load provided by assist. */
  assistShare: number;
  pressureMPa?: number;
  /** Net self-centring force when the driver lets go (N). <= 0 means the wheel will not return. */
  centringN: number;
  /** Steering force when hands-off at straight-ahead (N): non-zero means pull / self-steer. */
  handsOffForceN: number;
}

export function rackLoad(roadDeg: number, speedKmh: number, extraFrictionN = 0) {
  const x = Math.min(1, Math.abs(roadDeg) / MAX_ROAD_DEG);
  const park = Math.exp(-speedKmh / 8);
  const scrub = PARK_LOAD_N * Math.pow(x, 0.7) * park;
  const align = ALIGN_LOAD_N * x * (1 - park) + 900 * x * park;
  return { scrub, align, friction: BASE_FRICTION_N + extraFrictionN };
}

function hpsPressure(torqueNm: number, fault: SteeringFaultModel, rpm: number) {
  const pmax = P_MAX_MPA * (fault.pressureFactor ?? 1) * (rpm < 1000 ? (fault.idlePressureFactor ?? 1) : 1);
  const t = Math.max(0, (Math.abs(torqueNm) - 0.4) / 3.6);
  return pmax * Math.pow(Math.min(1, t), 1.6);
}

function epsGain(speedKmh: number) {
  return 2 + 7 * Math.exp(-speedKmh / 25);
}

function epsAssistNm(sensedNm: number, speedKmh: number, fault: SteeringFaultModel) {
  const f = fault.assistFactor ?? 1;
  const raw = epsGain(speedKmh) * f * sensedNm;
  const lim = EPS_MAX_ASSIST_NM * f;
  return Math.max(-lim, Math.min(lim, raw));
}

/** Solve driver torque so that driver force + assist = required rack force. */
export function solveSteering(inp: SteeringInput): SteeringOutput {
  const { system, fault, speedKmh, rpm } = inp;
  const sw = Math.max(-MAX_SW_DEG, Math.min(MAX_SW_DEG, inp.swDeg));
  const roadWheelDeg = (sw / MAX_SW_DEG) * MAX_ROAD_DEG;
  const dirSign = Math.sign(sw) || 1;
  const { scrub, align, friction } = rackLoad(roadWheelDeg, speedKmh, fault.extraFrictionN);
  // Loading: driver works against scrub + align + friction. Returning: align helps, friction resists.
  const rackLoadN = inp.direction > 0 ? scrub + align + friction : Math.max(0, friction + scrub * 0.3 - align * (fault.returnFactor ?? 1));
  const bias = fault.assistBias ?? 0;
  const biasMul = 1 + bias * dirSign;

  const assistAt = (T: number) => {
    if (system === 'hps') return hpsPressure(T, fault, rpm) * 1e6 * PISTON_AREA_M2 * biasMul;
    if (system === 'eps') return (epsAssistNm(T + (fault.sensorOffsetNm ?? 0) * dirSign, speedKmh, fault) * biasMul) / PINION_RADIUS_M;
    return 0;
  };

  let lo = 0;
  let hi = 80;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const f = mid / PINION_RADIUS_M + Math.max(0, assistAt(mid)) - rackLoadN;
    if (f > 0) hi = mid; else lo = mid;
  }
  const driverTorqueNm = (lo + hi) / 2;
  const assistForceN = Math.max(0, assistAt(driverTorqueNm));

  // Self-centring when released at this angle.
  const centringN = align * (fault.returnFactor ?? 1) - friction - scrub * 0.3;

  // Hands-off at straight-ahead: valve bias leaks pressure / EPS sees a phantom torque.
  let handsOffForceN = 0;
  if (system === 'hps' && bias) handsOffForceN = Math.abs(bias) * 0.12 * P_MAX_MPA * (fault.pressureFactor ?? 1) * 1e6 * PISTON_AREA_M2;
  if (system === 'eps' && fault.sensorOffsetNm) handsOffForceN = Math.abs(epsAssistNm(fault.sensorOffsetNm, speedKmh, fault)) / PINION_RADIUS_M;
  const pullSign = Math.sign(bias || fault.sensorOffsetNm || 1);
  handsOffForceN = Math.max(0, handsOffForceN - friction) * pullSign;

  return {
    roadWheelDeg,
    rackMm: sw * RACK_MM_PER_SW_DEG,
    rackLoadN,
    driverTorqueNm,
    assistForceN,
    assistShare: rackLoadN > 0 ? Math.min(1, assistForceN / rackLoadN) : 0,
    pressureMPa: system === 'hps' ? hpsPressure(driverTorqueNm, fault, rpm) : undefined,
    centringN,
    handsOffForceN,
  };
}

/**
 * Backlash (dead-band) between steering-wheel input and pinion: the output only moves once the
 * input has taken up the clearance in the direction of motion.
 */
export function applyBacklash(prevOut: number, input: number, playDeg: number): number {
  const half = playDeg / 2;
  if (input > prevOut + half) return input - half;
  if (input < prevOut - half) return input + half;
  return prevOut;
}

/** Driver-torque curve over steering angle (loading direction). */
export function torqueCurve(base: Omit<SteeringInput, 'swDeg' | 'direction'>, steps = 28) {
  const pts: Array<{ sw: number; t: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const sw = (i / steps) * MAX_SW_DEG;
    pts.push({ sw, t: solveSteering({ ...base, swDeg: sw, direction: 1 }).driverTorqueNm });
  }
  return pts;
}
