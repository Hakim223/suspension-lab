import type { SuspensionId } from '@suspension-lab/shared';
import type { Assembly, AssemblyId, ArchitectureTech, FailureMode, MechComponent, SteeringPart } from './types';
import { springDamperComponents } from './components/springDamper';
import { linkComponents } from './components/links';
import { jointComponents } from './components/joints';
import { axleComponents, stabilizerComponents, wheelHubComponents } from './components/chassis';
import { ARCHITECTURES } from './architectures';
import { STEERING_SYSTEMS, findSteeringPart } from './steering';

export * from './types';
export { ARCHITECTURES, STEERING_SYSTEMS, findSteeringPart };

export const ASSEMBLIES: Assembly[] = [
  { id: 'spring-damper', name: 'Pegas & Peredam', description: 'Menopang massa berpegas dan mengendalikan gerak suspensi.' },
  { id: 'links', name: 'Lengan & Link', description: 'Menentukan lintasan roda dan meneruskan gaya ke bodi.' },
  { id: 'joints', name: 'Sendi & Bushing', description: 'Sambungan yang memungkinkan gerak terkendali.' },
  { id: 'stabilizer', name: 'Sistem Stabilizer', description: 'Kekakuan roll tambahan.' },
  { id: 'wheel-hub', name: 'Roda & Hub', description: 'Knuckle/carrier, bearing, roda dan ban.' },
  { id: 'steering-linkage', name: 'Linkage Kemudi', description: 'Rack, tie rod dan poros — detail lengkap di modul Sistem Kemudi.' },
  { id: 'axle-structure', name: 'Struktur Poros', description: 'Balok puntir atau rumah poros kaku.' },
];

/** Rack travel per steering-wheel degree ≈ 50 mm / 360°. */
const RACK_MM_PER_DEG = 50 / 360;

/** Steering failures that change free play get a matching 3D rack-backlash profile when they have none. */
function withRackSim(f: SteeringPart['failureModes'][number]): FailureMode {
  if (f.sim || !f.model.freePlayDeg || f.model.freePlayDeg < 2) return f;
  return { ...f, sim: { kind: 'rack-backlash', params: { playMm: +(f.model.freePlayDeg * RACK_MM_PER_DEG).toFixed(2), visualExaggeration: 5 }, mode: 'steer' } };
}

function fromSteering(id: string, name: string, term: string, partIds: string[], extra: Partial<MechComponent>): MechComponent {
  const parts = partIds.map((p) => findSteeringPart(p)!.part);
  return {
    id,
    name,
    term,
    assembly: 'steering-linkage',
    summary: parts[0]!.function,
    function: parts.map((p) => p.function).join(' '),
    mounting: '',
    movement: '',
    subcomponents: parts.map((p) => ({ id: p.id, name: p.name, term: p.term, function: p.function, construction: p.construction })),
    failureModes: parts.flatMap((p) => p.failureModes.map((f) => withRackSim({ ...f, subcomponentId: p.id }))),
    ...extra,
  };
}

const steeringLinkageComponents: MechComponent[] = [
  fromSteering('rack-and-pinion', 'Rack & Pinion', 'Rack and pinion steering gear', ['rack-housing', 'rack-gear', 'pinion-gear', 'rack-guide'], {
    model3d: 'rack-and-pinion', anatomy: 'rack-pinion',
    mounting: 'Rumah rack dibaut ke subframe/dinding bodi melalui bushing; poros input pinion ke poros setir.',
    movement: 'Rack bergeser lateral ±60–80 mm; pinion berputar ±1,3–1,6 putaran setir lock-to-lock (tergantung rasio).',
  }),
  fromSteering('inner-tie-rod', 'Inner Tie Rod', 'Inner tie rod', ['inner-tie-rod'], {
    model3d: 'tie-rod-end', anatomy: 'ball-joint',
    mounting: 'Disekrup ke ujung rack di dalam bellows.',
    movement: 'Berayun mengikuti suspensi; bergeser bersama rack.',
  }),
  fromSteering('outer-tie-rod-end', 'Outer Tie Rod End', 'Outer tie rod end', ['outer-tie-rod-end'], {
    model3d: 'tie-rod-end', anatomy: 'ball-joint',
    mounting: 'Stud taper ke lengan kemudi knuckle (mur castle/nyloc); rumah disekrup ke tie rod sebagai penyetel toe.',
    movement: 'Berayun dan berputar mengikuti suspensi dan kemudi.',
  }),
  fromSteering('rack-mount-bushing', 'Bushing Dudukan Rack', 'Rack mounting bushings', ['rack-mount-bushing'], {
    model3d: 'rack-and-pinion',
    mounting: 'Klem di subframe.',
    movement: 'Defleksi kecil saat beban kemudi.',
  }),
  fromSteering('steering-shaft', 'Poros Setir, U-Joint & Coupling', 'Steering shaft, universal joint, coupling', ['steering-shaft', 'steering-coupling'], {
    mounting: 'Dari kolom setir melalui dinding (firewall) ke poros input pinion.',
    movement: 'Berputar; spline teleskopik menyerap gerak relatif kabin–subframe.',
  }),
];

export const MECH_COMPONENTS: MechComponent[] = [
  ...springDamperComponents,
  ...linkComponents,
  ...jointComponents,
  ...stabilizerComponents,
  ...wheelHubComponents,
  ...axleComponents,
  ...steeringLinkageComponents,
];

const byId = new Map(MECH_COMPONENTS.map((c) => [c.id, c]));

export function getMechComponent(id: string | null | undefined): MechComponent | undefined {
  return id ? byId.get(id) : undefined;
}

export function getArchitecture(id: string | undefined): ArchitectureTech | undefined {
  return ARCHITECTURES.find((a) => a.id === id);
}

export function getAssembly(id: AssemblyId): Assembly {
  return ASSEMBLIES.find((a) => a.id === id)!;
}

/** All component ids used by an architecture (for 3D availability checks). */
export function architectureComponentIds(id: SuspensionId): string[] {
  return getArchitecture(id)?.assemblies.flatMap((a) => a.components.map((c) => c.componentId)) ?? [];
}

export function findFailure(componentId: string, failureId: string): FailureMode | undefined {
  return getMechComponent(componentId)?.failureModes.find((f) => f.id === failureId);
}

export const SEVERITY_LABEL: Record<FailureMode['severity'], string> = {
  rendah: 'Rendah',
  sedang: 'Sedang',
  tinggi: 'Tinggi',
  kritis: 'Kritis (keselamatan)',
};
