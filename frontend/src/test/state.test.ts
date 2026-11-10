import { beforeEach, describe, expect, it } from 'vitest';
import { useLab } from '../state/labStore';

describe('lab store (simulation state)', () => {
  beforeEach(() => useLab.getState().resetForSuspension());

  it('linked manual controls move both wheels and switch to manual mode', () => {
    useLab.getState().setPlaying(true);
    useLab.getState().setManual({ left: 0.03 });
    const s = useLab.getState();
    expect(s.manual.left).toBe(0.03);
    expect(s.manual.right).toBe(0.03);
    expect(s.mode).toBe('manual');
    expect(s.playing).toBe(false);
  });

  it('unlinked manual controls move one wheel only', () => {
    useLab.getState().setManual({ linked: false });
    useLab.getState().setManual({ right: -0.02 });
    expect(useLab.getState().manual.left).toBe(0);
    expect(useLab.getState().manual.right).toBe(-0.02);
  });

  it('clamps speed and damage intensity', () => {
    useLab.getState().setSpeed(10);
    useLab.getState().setDamageIntensity(-1);
    expect(useLab.getState().speed).toBe(2);
    expect(useLab.getState().damageIntensity).toBe(0);
  });

  it('selecting a damage scenario defaults to the damaged view', () => {
    useLab.getState().setDamageView('normal');
    useLab.getState().setDamageScenario('weak-shock');
    expect(useLab.getState().damageView).toBe('damaged');
  });

  it('hide/show toggles and show-all', () => {
    useLab.getState().toggleHidden('wheel-assembly');
    expect(useLab.getState().hidden['wheel-assembly']).toBe(true);
    useLab.getState().showAll();
    expect(useLab.getState().hidden).toEqual({});
  });

  it('switching suspension resets selection, damage and animation', () => {
    const s = useLab.getState();
    s.select('ball-joint');
    s.setDamageScenario('ball-joint-play');
    s.setExploded(true);
    s.setPlaying(true);
    s.resetForSuspension();
    const r = useLab.getState();
    expect([r.selectedComponentId, r.damageScenarioId, r.exploded, r.playing]).toEqual([null, null, false, false]);
  });
});
