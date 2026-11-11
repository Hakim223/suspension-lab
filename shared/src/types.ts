/**
 * Shared domain types for Suspension Lab.
 * Content in ../content/*.json follows these shapes and is bundled into the static site.
 */

export const SUSPENSION_IDS = [
  'macpherson',
  'double-wishbone',
  'torsion-beam',
  'multi-link',
  'rigid-axle',
] as const;
export type SuspensionId = (typeof SUSPENSION_IDS)[number];

export const COMPONENT_CATEGORIES = [
  'peredam',
  'lengan',
  'sambungan',
  'kemudi',
  'stabilizer',
  'roda',
  'struktur',
] as const;
export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  peredam: 'Pegas & Peredam',
  lengan: 'Lengan & Link',
  sambungan: 'Sambungan & Bushing',
  kemudi: 'Sistem Kemudi',
  stabilizer: 'Stabilizer',
  roda: 'Roda & Hub',
  struktur: 'Struktur Poros',
};

export type AxlePosition = 'depan' | 'belakang';

export interface SuspensionComponentLink {
  componentId: string;
  /** Optional architecture-specific name, e.g. "Bushing Trailing Arm". */
  localName?: string;
  /** What this component does inside this particular architecture. */
  roleDescription: string;
  /** Short note such as "2 per sisi". */
  quantityNote?: string;
  sortOrder: number;
}

export interface SuspensionType {
  id: SuspensionId;
  name: string;
  nameEn: string;
  tagline: string;
  axlePosition: AxlePosition;
  /** Independent (each wheel moves on its own) vs. dependent / semi-dependent. */
  independence: 'independen' | 'semi-independen' | 'dependen';
  summary: string;
  description: string;
  howItWorks: string[];
  typicalApplications: string[];
  advantages: string[];
  disadvantages: string[];
  steerable: boolean;
  /** Key used by the 3D model registry (procedural builder or GLB). */
  modelKey: string;
  sortOrder: number;
  components: SuspensionComponentLink[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface SuspensionComponent {
  id: string;
  name: string;
  nameEn: string;
  category: ComponentCategory;
  summary: string;
  function: string;
  workingPrinciple: string;
  location: string;
  failureModes: string[];
  symptoms: string[];
  consequences: string[];
  inspection: string[];
  terms: GlossaryTerm[];
  /** Composite components (e.g. strut assembly) highlight these children. */
  includes?: string[];
  sortOrder: number;
}

export const DAMAGE_SIM_KINDS = [
  'bushing-play',
  'ball-joint-play',
  'weak-damper',
  'stabilizer-link-loose',
  'strut-mount-worn',
  'tie-rod-play',
  // Additional kinds used by Mechanic Mode failure modes:
  'damper-change',
  'spring-sag',
  'wheel-bearing-play',
  'rack-backlash',
] as const;
export type DamageSimKind = (typeof DAMAGE_SIM_KINDS)[number];

export interface DamageSimulationConfig {
  kind: DamageSimKind;
  /** Numeric parameters that drive the illustrative visual (all in SI units unless named otherwise). */
  params: Record<string, number>;
  /** Animation mode that best demonstrates the failure. */
  recommendedMode: AnimationMode;
}

export interface DamageScenario {
  id: string;
  componentId: string;
  title: string;
  shortTitle: string;
  severity: 'sedang' | 'tinggi';
  normalCondition: string;
  damagedCondition: string;
  failureDescription: string;
  symptoms: string[];
  safetyImplications: string[];
  inspection: string[];
  simulation: DamageSimulationConfig;
  sortOrder: number;
}

export type AnimationMode = 'bump' | 'rough' | 'steer' | 'manual';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
}

/** Data-layer aggregate for a suspension with resolved components. */
export interface SuspensionWithComponents extends SuspensionType {
  resolvedComponents: Array<SuspensionComponent & { link: SuspensionComponentLink }>;
}
