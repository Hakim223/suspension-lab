import { Vector3 } from 'three';
import type { DamageInput, RigFrame, Side } from '../rig/types';

/**
 * Converts an active damage scenario into ILLUSTRATIVE geometric offsets for one corner.
 * These are visual exaggerations to explain the failure — not measurements or diagnostic thresholds.
 * Damage is applied only to the RIGHT side so the left side remains a healthy reference.
 */
export interface CornerDamage {
  /** Shift of the lower-arm inner pivot (worn bushing). */
  pivotOffset: Vector3;
  /** Offset of the knuckle relative to the arm end (ball-joint free play). */
  ballJointOffset: Vector3;
  /** Shift of the strut top mount (worn strut mount). */
  mountOffset: Vector3;
  /** Rubber squash factor 0..1 for the mount visual. */
  mountSquash: number;
  /** Change of stabilizer-link effective length (loose link joints). */
  linkPlay: number;
  /** Extra toe angle (rad) from a worn tie-rod end. */
  toeWobble: number;
  /** Static ride-height change seen as extra compression (m) — sagged/broken spring. */
  travelBias: number;
  /** Wheel/hub wobble angle (rad) — wheel-bearing play. */
  hubWobble: number;
}

/** Effects that act on both sides (e.g. steering-rack backlash moves both tie rods). */
export interface GlobalDamage {
  /** Rack position lag (m): the rack trails the steering input by the gear/guide clearance. */
  rackOffset: number;
}

export const NO_GLOBAL: Readonly<GlobalDamage> = Object.freeze({ rackOffset: 0 });

export function globalDamage(d: DamageInput | null, frame: RigFrame): GlobalDamage {
  if (!d || d.intensity <= 0 || d.kind !== 'rack-backlash') return NO_GLOBAL;
  const ex = (d.params.visualExaggeration ?? 1) * d.intensity;
  const play = ((d.params.playMm ?? 1) / 1000) * ex;
  // Clearance is taken up in the direction of motion, so the rack lags the input by half the play.
  return { rackOffset: -0.5 * play * Math.tanh(frame.rackVel * 6) };
}

export const NO_DAMAGE: Readonly<CornerDamage> = Object.freeze({
  pivotOffset: new Vector3(),
  ballJointOffset: new Vector3(),
  mountOffset: new Vector3(),
  mountSquash: 0,
  linkPlay: 0,
  toeWobble: 0,
  travelBias: 0,
  hubWobble: 0,
});

const knock = (v: number, gain: number) => Math.tanh(v * gain);
const shimmy = (t: number) => 0.6 * Math.sin(t * 37.1) + 0.4 * Math.sin(t * 23.3 + 1.3);

export function cornerDamage(d: DamageInput | null, frame: RigFrame, side: Side): CornerDamage {
  if (!d || side !== 'R' || d.intensity <= 0) return NO_DAMAGE;
  const ex = (d.params.visualExaggeration ?? 1) * d.intensity;
  const v = frame.vel.R;
  const activity = Math.min(1, Math.abs(v) * 6 + Math.abs(frame.rackVel) * 0.8);
  const out: CornerDamage = {
    pivotOffset: new Vector3(),
    ballJointOffset: new Vector3(),
    mountOffset: new Vector3(),
    mountSquash: 0,
    linkPlay: 0,
    toeWobble: 0,
    travelBias: 0,
    hubWobble: 0,
  };
  switch (d.kind) {
    case 'bushing-play': {
      const play = ((d.params.playMm ?? 5) / 1000) * ex;
      // Arm shifts fore/aft and sideways inside the torn rubber when load changes direction.
      // Permanent set of a deformed bushing: the arm sits displaced even at rest.
      const set = ((d.params.staticShiftMm ?? 0) / 1000) * ex;
      out.pivotOffset.set(play * 0.5 * knock(v, 14), 0, -set - play * knock(v, 14) + play * 0.35 * shimmy(frame.time) * activity);
      break;
    }
    case 'ball-joint-play': {
      const play = ((d.params.playMm ?? 4) / 1000) * ex;
      out.ballJointOffset.set(play * 0.4 * shimmy(frame.time) * activity, play * knock(v, 16), 0);
      break;
    }
    case 'strut-mount-worn': {
      const play = ((d.params.playMm ?? 4) / 1000) * ex;
      const sag = ((d.params.sagMm ?? 6) / 1000) * ex;
      out.mountOffset.set(play * knock(frame.rackVel, 6) + play * 0.3 * shimmy(frame.time) * activity, -sag + play * 0.5 * knock(v, 10), 0);
      out.mountSquash = Math.min(1, 0.6 * d.intensity);
      break;
    }
    case 'tie-rod-play': {
      const amp = (((d.params.toeWobbleDeg ?? 1) * Math.PI) / 180) * ex;
      const rolling = Math.min(1, Math.abs(frame.vel.R) * 8 + 0.35);
      out.toeWobble = amp * (0.55 * Math.sin(frame.time * Math.PI * 2 * 4.2) * rolling + 0.45 * knock(frame.rackVel, 8));
      break;
    }
    case 'stabilizer-link-loose': {
      const play = ((d.params.playMm ?? 8) / 1000) * ex;
      out.linkPlay = play * knock(frame.vel.R - frame.vel.L, 10);
      break;
    }
    case 'weak-damper':
    case 'damper-change':
      // Handled by the timeline (changed damping ratio on the right side).
      break;
    case 'spring-sag':
      // A sagged spring lowers that corner: relative to the body the wheel sits further into bump.
      out.travelBias = ((d.params.sagMm ?? 15) / 1000) * d.intensity;
      break;
    case 'wheel-bearing-play': {
      const amp = (((d.params.playDeg ?? 0.3) * Math.PI) / 180) * ex;
      const rolling = Math.min(1, Math.abs(frame.vel.R) * 8 + 0.4);
      out.hubWobble = amp * (0.6 * Math.sin(frame.time * Math.PI * 2 * 3.1) + 0.4 * knock(frame.rackVel, 6)) * rolling;
      break;
    }
    case 'rack-backlash':
      // Global effect — see globalDamage().
      break;
  }
  return out;
}
