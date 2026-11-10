import { describe, expect, it } from 'vitest';
import {
  COMPONENT_CATEGORIES,
  DAMAGE_SIM_KINDS,
  SUSPENSION_IDS,
  components,
  damageScenarios,
  quiz,
  resolveSuspension,
  scenariosForSuspension,
  suspensions,
} from '../src';

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

describe('content integrity', () => {
  it('has exactly the five required architectures', () => {
    expect(suspensions.map((s) => s.id).sort()).toEqual([...SUSPENSION_IDS].sort());
  });

  it('every suspension has full educational fields', () => {
    for (const s of suspensions) {
      for (const k of ['name', 'summary', 'description', 'tagline'] as const) expect(nonEmpty(s[k]), `${s.id}.${k}`).toBe(true);
      expect(s.howItWorks.length).toBeGreaterThan(1);
      expect(s.typicalApplications.length).toBeGreaterThan(0);
      expect(s.advantages.length).toBeGreaterThan(0);
      expect(s.disadvantages.length).toBeGreaterThan(0);
      expect(s.components.length).toBeGreaterThan(4);
    }
  });

  it('component ids are unique and referenced ids exist', () => {
    const ids = components.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of suspensions) expect(() => resolveSuspension(s)).not.toThrow();
    for (const c of components) for (const inc of c.includes ?? []) expect(ids).toContain(inc);
  });

  it('every component has complete information panel content', () => {
    for (const c of components) {
      expect(COMPONENT_CATEGORIES).toContain(c.category);
      for (const k of ['name', 'function', 'workingPrinciple', 'location', 'summary'] as const) expect(nonEmpty(c[k]), `${c.id}.${k}`).toBe(true);
      for (const k of ['failureModes', 'symptoms', 'consequences', 'inspection'] as const) expect(c[k].length, `${c.id}.${k}`).toBeGreaterThan(0);
    }
  });

  it('architectures do not share identical component sets', () => {
    const sets = suspensions.map((s) => s.components.map((c) => c.componentId).sort().join(','));
    expect(new Set(sets).size).toBe(sets.length);
    const mac = suspensions.find((s) => s.id === 'macpherson')!;
    expect(mac.components.some((c) => c.componentId === 'upper-control-arm')).toBe(false);
    expect(mac.components.some((c) => c.componentId === 'strut-assembly')).toBe(true);
  });

  it('includes all 18 required component types', () => {
    const required = ['shock-absorber','coil-spring','strut-assembly','strut-mount','lower-control-arm','upper-control-arm','ball-joint','lower-arm-bushing','stabilizer-bar','stabilizer-link','steering-knuckle','tie-rod-end','rack-and-pinion','wheel-hub','trailing-arm','torsion-beam','panhard-rod','multi-link-arms'];
    const ids = components.map((c) => c.id);
    for (const r of required) expect(ids).toContain(r);
  });

  it('damage scenarios are valid and cover the six required cases', () => {
    expect(damageScenarios).toHaveLength(6);
    for (const d of damageScenarios) {
      expect(DAMAGE_SIM_KINDS).toContain(d.simulation.kind);
      expect(components.some((c) => c.id === d.componentId)).toBe(true);
      expect(d.symptoms.length).toBeGreaterThan(0);
      expect(d.safetyImplications.length).toBeGreaterThan(0);
      expect(d.inspection.length).toBeGreaterThan(0);
    }
  });

  it('scenario availability depends on architecture', () => {
    const tb = scenariosForSuspension('torsion-beam').map((d) => d.id);
    expect(tb).not.toContain('ball-joint-play');
    expect(tb).toContain('weak-shock');
    expect(scenariosForSuspension('macpherson').map((d) => d.id)).toContain('strut-mount-worn');
  });

  it('quiz answers are in range', () => {
    for (const q of quiz) {
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
    }
  });
});
