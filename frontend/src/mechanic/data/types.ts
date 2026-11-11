import type { AnimationMode, DamageSimKind, SuspensionId } from '@suspension-lab/shared';

/**
 * Mechanic Mode data model. Hierarchy:
 * Architecture → Assembly → Component → Subcomponent → FailureMode
 *   → mechanicalEffect → symptoms → inspection (+ differentiation).
 * Pure data — no UI code. Rendered by src/mechanic/components/*.
 */

export type AssemblyId =
  | 'spring-damper'
  | 'links'
  | 'joints'
  | 'stabilizer'
  | 'wheel-hub'
  | 'steering-linkage'
  | 'axle-structure';

export interface Assembly {
  id: AssemblyId;
  name: string;
  description: string;
}

export interface Subcomponent {
  id: string;
  name: string;
  /** English technical term. */
  term?: string;
  function: string;
  /** Typical material / construction. */
  construction?: string;
}

export type Severity = 'rendah' | 'sedang' | 'tinggi' | 'kritis';

/** How (and whether) the failure can be shown in the 3D architecture model. */
export interface FailureSimulation {
  kind: DamageSimKind;
  params: Record<string, number>;
  mode: AnimationMode;
}

export interface FailureMode {
  id: string;
  name: string;
  /** Subcomponent where the failure physically originates. */
  subcomponentId?: string;
  severity: Severity;
  /** 1. What physically fails. */
  whatFails: string;
  /** 2. Why the failure occurs. */
  cause: string;
  /** 3. What movement / mechanical behaviour changes. */
  mechanicalEffect: string;
  /** 4. What the driver may experience (observable symptoms). */
  symptoms: string[];
  /** 5. What a mechanic should inspect, in order. */
  inspection: string[];
  /** 6. How to distinguish it from similar failures. */
  differentiation: string[];
  /** Quantitative/qualitative indicators shown next to the simulation. */
  indicators?: string[];
  /** 3D simulation profile. Absent ⇒ no visible geometric change; `visualNote` explains why. */
  sim?: FailureSimulation;
  visualNote?: string;
}

export interface MechComponent {
  id: string;
  name: string;
  term: string;
  assembly: AssemblyId;
  summary: string;
  function: string;
  /** Where/how it is mounted. */
  mounting: string;
  /** How it moves during suspension/steering motion. */
  movement: string;
  subcomponents: Subcomponent[];
  failureModes: FailureMode[];
  /** Component id used by the procedural 3D models (for highlighting/simulation), if represented. */
  model3d?: string;
  /** Anatomy model key (src/mechanic/anatomy). */
  anatomy?: string;
}

export interface ArchitectureComponentRef {
  componentId: string;
  /** Architecture-specific role, mounting and load path. */
  role: string;
  /** e.g. "2 per sisi", "hanya pada varian tertentu". */
  note?: string;
}

export interface ArchitectureTech {
  id: SuspensionId;
  layout: string;
  loadPath: string[];
  kinematics: string[];
  serviceNotes: string[];
  assemblies: Array<{ assembly: AssemblyId; components: ArchitectureComponentRef[] }>;
}

/* -------------------------------------------------------------------------- */
/* Steering module                                                             */
/* -------------------------------------------------------------------------- */

export type SteeringSystemId = 'mechanical' | 'hps' | 'eps';
export type FaultDomain = 'mekanis' | 'hidraulik' | 'elektrik' | 'elektronik';

/** Parameters for the simplified steering-effort model (src/mechanic/steering/steeringModel.ts). */
export interface SteeringFaultModel {
  /** Free play at the steering wheel, degrees. */
  freePlayDeg?: number;
  /** Extra friction at the rack, newtons. */
  extraFrictionN?: number;
  /** Multiplier on available hydraulic pressure (HPS). */
  pressureFactor?: number;
  /** Pressure factor at idle only (pump wear shows most at low rpm). */
  idlePressureFactor?: number;
  /** Assist asymmetry: + assists left more than right (valve / torque-sensor offset). */
  assistBias?: number;
  /** Multiplier on electric assist (EPS). */
  assistFactor?: number;
  /** Torque-sensor offset in Nm (EPS): the system "feels" driver torque that is not there. */
  sensorOffsetNm?: number;
  /** Self-centering multiplier (1 = normal). */
  returnFactor?: number;
  /** Noise indicator shown in the schematic. */
  noise?: string;
}

export interface SteeringFailure extends Omit<FailureMode, 'sim'> {
  domain: FaultDomain;
  model: SteeringFaultModel;
  /** Optional 3D profile when the failure also shows on the suspension model (tie rods/rack). */
  sim?: FailureSimulation;
}

export interface SteeringPart {
  id: string;
  name: string;
  term: string;
  function: string;
  construction: string;
  /** Element id in the schematic SVG to highlight. */
  schematic?: string;
  failureModes: SteeringFailure[];
  anatomy?: string;
}

export interface SteeringSystem {
  id: SteeringSystemId;
  name: string;
  summary: string;
  principle: string[];
  variants?: Array<{ name: string; description: string; pros: string; cons: string }>;
  parts: SteeringPart[];
}

/* -------------------------------------------------------------------------- */
/* Diagnostics                                                                 */
/* -------------------------------------------------------------------------- */

export type ComplaintCategory =
  | 'ketukan'
  | 'decit'
  | 'getar-setir'
  | 'setir-oblak'
  | 'setir-berat'
  | 'setir-tidak-kembali'
  | 'menarik'
  | 'limbung'
  | 'memantul'
  | 'keras'
  | 'aus-ban'
  | 'gerak-saat-rem'
  | 'dengung';

export interface CauseCandidate {
  /** Component id (suspension) or steering part id. */
  ref: string;
  failureId?: string;
  label: string;
  /** Why it fits (or only partly fits) the complaint. */
  reasoning: string;
  /** Whether this is the cause actually found in the worked case. */
  confirmed?: boolean;
}

export interface DiagnosticCase {
  id: string;
  category: ComplaintCategory;
  title: string;
  vehicle: string;
  architecture: SuspensionId;
  complaint: string;
  conditions: string[];
  possibleCauses: CauseCandidate[];
  inspectComponents: string[];
  procedure: string[];
  expectedFindings: Array<{ component: string; finding: string }>;
  alternatives: string[];
  distinctions: string[];
  /** Outcome of the worked example (teaching only). */
  resolution: string;
}
