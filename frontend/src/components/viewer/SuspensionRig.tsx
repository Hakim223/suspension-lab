import { useEffect, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import type { DamageScenario } from '@suspension-lab/shared';
import { useLab } from '../../state/labStore';
import { simClock } from '../../three/sim/clock';
import { TRAVEL_LIMIT, type Timeline } from '../../three/sim/timeline';
import { cornerDamage } from '../../three/sim/damageEffects';
import { applyVisualState, expandSelection, prepareMaterials } from '../../three/rig/visualState';
import type { RigFrame, SuspensionModel } from '../../three/rig/types';
import { WHEEL_RADIUS } from '../../three/models/common';

export interface RigProps {
  model: SuspensionModel;
  includes: Map<string, string[] | undefined>;
  damageScenario: DamageScenario | null;
  steerable: boolean;
  timeline: Timeline;
  onFrame?: (frame: RigFrame) => void;
}

/**
 * Drives a SuspensionModel: animation clock, kinematics, damage, picking and highlight state.
 * Per-frame work happens in useFrame and mutates Three objects directly (no React re-render).
 */
export function SuspensionRig({ model, includes, damageScenario, steerable, timeline, onFrame }: RigProps) {
  const damageView = useLab((s) => s.damageView);
  const exploded = useLab((s) => s.exploded);
  const damageActive = !!damageScenario && damageView === 'damaged';

  useEffect(() => {
    simClock.duration = timeline.duration;
    simClock.emit();
  }, [timeline]);

  useEffect(() => {
    prepareMaterials(model);
  }, [model]);

  // Highlight / visibility state — re-applied only when relevant store fields change.
  useEffect(() => {
    const apply = () => {
      const s = useLab.getState();
      applyVisualState(model, {
        selected: expandSelection(s.selectedComponentId, includes),
        hovered: s.hoveredComponentId,
        hidden: s.hidden,
        ghost: s.ghostOthers,
        damagedComponentId: s.damageScenarioId && s.damageView === 'damaged' ? (damageScenario?.componentId ?? null) : null,
      });
    };
    apply();
    return useLab.subscribe((s, p) => {
      if (
        s.selectedComponentId !== p.selectedComponentId ||
        s.hoveredComponentId !== p.hoveredComponentId ||
        s.hidden !== p.hidden ||
        s.ghostOthers !== p.ghostOthers ||
        s.damageScenarioId !== p.damageScenarioId ||
        s.damageView !== p.damageView
      )
        apply();
    });
  }, [model, includes, damageScenario]);

  // Exploded view tween (GSAP) on the shared clock object.
  useEffect(() => {
    const tween = gsap.to(simClock, { explode: exploded ? 1 : 0, duration: 0.9, ease: 'power2.inOut' });
    return () => {
      tween.kill();
    };
  }, [exploded]);

  const emitAcc = useRef(0);
  const frame = useRef<RigFrame>({
    travel: { L: 0, R: 0 },
    vel: { L: 0, R: 0 },
    rack: 0,
    rackVel: 0,
    time: 0,
    wheelAngle: 0,
    explode: 0,
    damage: null,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = useLab.getState();
    if (simClock.seekTo !== null) {
      simClock.t = simClock.seekTo;
      simClock.seekTo = null;
    }
    const f = frame.current;
    const running = s.playing && s.mode !== 'manual';
    if (running) simClock.t = (simClock.t + dt * s.speed) % timeline.duration;

    if (s.mode === 'manual') {
      f.travel.L = s.manual.left;
      f.travel.R = s.manual.right;
      f.vel.L = 0;
      f.vel.R = 0;
      f.rack = steerable ? s.manual.steer : 0;
      f.rackVel = 0;
    } else {
      const smp = timeline.sample(simClock.t);
      f.travel.L = smp.travel.L;
      f.travel.R = smp.travel.R;
      f.vel.L = running ? smp.vel.L : 0;
      f.vel.R = running ? smp.vel.R : 0;
      f.rack = steerable ? smp.rack : 0;
      f.rackVel = running && steerable ? smp.rackVel : 0;
      if (running) simClock.wheelAngle += (dt * s.speed * smp.speed) / WHEEL_RADIUS;
    }
    // Damage "knock" effects keep animating gently even when paused, so the play is visible.
    f.time += running ? dt * s.speed : dt * 0.25;
    f.wheelAngle = simClock.wheelAngle;
    f.explode = simClock.explode;
    f.damage = damageActive
      ? { kind: damageScenario!.simulation.kind, params: damageScenario!.simulation.params, intensity: s.damageIntensity }
      : null;
    const bias = cornerDamage(f.damage, f, 'R').travelBias;
    simClock.travelBiasR = bias;
    if (bias) f.travel.R = Math.min(TRAVEL_LIMIT, f.travel.R + bias);
    model.update(f);
    simClock.readout.travelL = f.travel.L;
    simClock.readout.travelR = f.travel.R;
    simClock.readout.rack = f.rack;
    onFrame?.(f);

    emitAcc.current += dt;
    if (emitAcc.current > 0.08) {
      emitAcc.current = 0;
      simClock.emit();
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return; // it was a drag (orbit), not a tap
    e.stopPropagation();
    const id = pickComponent(e);
    if (id) useLab.getState().select(useLab.getState().selectedComponentId === id ? null : id);
  };

  const hover = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== 'mouse') return;
    e.stopPropagation();
    const id = pickComponent(e);
    if (useLab.getState().hoveredComponentId !== id) useLab.getState().hover(id);
    document.body.style.cursor = id ? 'pointer' : 'auto';
  };

  return (
    <primitive
      object={model.root}
      onClick={pick}
      onPointerMove={hover}
      onPointerOut={() => {
        useLab.getState().hover(null);
        document.body.style.cursor = 'auto';
      }}
    />
  );
}

/** Choose the best intersected component: visible, selectable, and behind the (transparent) wheel if possible. */
function pickComponent(e: ThreeEvent<MouseEvent | PointerEvent>): string | null {
  let fallback: string | null = null;
  for (const hit of e.intersections) {
    let o: typeof hit.object | null = hit.object;
    let visible = true;
    let id: string | null | undefined;
    while (o) {
      if (!o.visible) visible = false;
      if (id === undefined && o.userData.componentId !== undefined) id = o.userData.componentId as string | null;
      o = o.parent;
    }
    if (!visible || !id) continue;
    if (id === 'wheel-assembly') {
      fallback ??= id;
      continue;
    }
    return id;
  }
  return fallback;
}
