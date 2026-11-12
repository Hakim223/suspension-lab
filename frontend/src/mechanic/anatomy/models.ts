import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';
import { SpringGeometry } from '../../three/rig/parts';
import type { FailureMode } from '../data/types';
import { getMechComponent } from '../data';
import { findSteeringPart } from '../data/steering';

/**
 * Procedural anatomy models. These are SIMPLIFIED constructions showing the real sub-parts and
 * their arrangement (not CAD of a specific product). Each part is independently selectable,
 * has an exploded offset, and can be cut away (clipping plane z = 0) to show the interior.
 */

export interface AnatomyPart {
  id: string;
  name: string;
  /** Matching subcomponent id in the component data (for descriptions). */
  sub?: string;
  build: () => Object3D;
  explode: [number, number, number];
  /** Included in the cutaway clipping. */
  cut?: boolean;
}

/** Data-driven visual for a failure: which parts change and how. */
export interface FailureVisual {
  parts: string[];
  tint?: string;
  /** Oscillating translation amplitude (exaggerated clearance), synced with the motion. */
  move?: [number, number, number];
  /** Static offset (permanent set / separation). */
  offset?: [number, number, number];
  /** Static tilt about Z (rad) — bent parts. */
  tilt?: number;
  hide?: boolean;
  /** These parts stop moving (seized). */
  freeze?: boolean;
  /** Overall motion amplitude multiplier (e.g. binding reduces stroke). */
  motionScale?: number;
  scale?: [number, number, number];
  /** Static rotation (rad, XYZ) — e.g. a bushing clamped while twisted. */
  rotate?: [number, number, number];
  /** Secondary effects on other parts (e.g. oil level dropping when the seal leaks). */
  also?: Array<Omit<FailureVisual, 'note' | 'also'>>;
  note: string;
}

export type MotionKind = 'stroke' | 'articulate' | 'rotate' | 'twist' | 'steer' | 'gear';

export interface AnatomyModel {
  id: string;
  name: string;
  /** Mechanic component / steering part ids whose failures apply. */
  sources: string[];
  description: string;
  simplification: string;
  motion: MotionKind;
  /** Parts animated by the motion (e.g. piston + rod for a stroke). */
  moving: string[];
  camera: [number, number, number];
  target: [number, number, number];
  parts: AnatomyPart[];
  failures: Record<string, FailureVisual>;
}

/* ------------------------------- helpers -------------------------------- */
const mat = (color: string, o: Partial<MeshStandardMaterial> = {}) =>
  new MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.45, side: DoubleSide, ...o });
const M = {
  steel: () => mat('#a3adbb', { metalness: 0.8, roughness: 0.3 }),
  chrome: () => mat('#e3e8ef', { metalness: 1, roughness: 0.12 }),
  dark: () => mat('#3d4656'),
  rubber: () => mat('#1d1f24', { metalness: 0, roughness: 0.9 }),
  polymer: () => mat('#d8d2c4', { metalness: 0, roughness: 0.6 }),
  oil: () => mat('#c98a12', { metalness: 0, roughness: 0.2, transparent: true, opacity: 0.45, depthWrite: false }),
  gas: () => mat('#7dd3fc', { metalness: 0, roughness: 0.2, transparent: true, opacity: 0.2, depthWrite: false }),
  grease: () => mat('#e2b84a', { metalness: 0, roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false }),
  yellow: () => mat('#c9a227'),
  spring: () => mat('#b8443b'),
  alu: () => mat('#c3cad4', { metalness: 0.7, roughness: 0.35 }),
  violet: () => mat('#8b7fd6'),
};
const mesh = (g: BufferGeometry, m: MeshStandardMaterial, y = 0, x = 0, z = 0) => {
  const o = new Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};
const cyl = (r: number, h: number, m: MeshStandardMaterial, y = 0, open = false, seg = 40) => mesh(new CylinderGeometry(r, r, h, seg, 1, open), m, y + h / 2);
const group = (...o: Object3D[]) => {
  const g = new Group();
  g.add(...o);
  return g;
};
/** Thick-walled tube (annulus) via lathe. */
const tube = (rIn: number, rOut: number, h: number, m: MeshStandardMaterial, y = 0) =>
  mesh(new LatheGeometry([new Vector2(rIn, 0), new Vector2(rOut, 0), new Vector2(rOut, h), new Vector2(rIn, h), new Vector2(rIn, 0)], 48), m, y);
const bellows = (r0: number, r1: number, h: number, folds: number, m: MeshStandardMaterial, y = 0) => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= folds * 2; i++) pts.push(new Vector2(i % 2 ? r1 : r0, (i / (folds * 2)) * h));
  return mesh(new LatheGeometry(pts, 40), m, y);
};

/** A ball-and-socket joint (housing, liner, ball stud, grease, boot) along +Y. Scale s. */
function jointParts(s = 1, prefix = ''): AnatomyPart[] {
  const p = (id: string) => (prefix ? `${prefix}-${id}` : id);
  return [
    { id: p('housing'), name: 'Rumah sambungan', sub: 'housing', cut: true, explode: [0, -0.16 * s, 0], build: () => group(tube(0.055 * s, 0.07 * s, 0.09 * s, M.steel(), -0.05 * s), cyl(0.07 * s, 0.012 * s, M.steel(), -0.062 * s), mesh(new BoxGeometry(0.03 * s, 0.03 * s, 0.14 * s), M.steel(), -0.03 * s, 0.085 * s)) },
    { id: p('liner'), name: 'Liner / socket polimer', sub: 'liner', cut: true, explode: [0, -0.09 * s, 0], build: () => mesh(new SphereGeometry(0.052 * s, 32, 20, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.68), M.polymer()) },
    { id: p('ball-stud'), name: 'Ball stud', sub: 'ball-stud', explode: [0, 0.06 * s, 0], build: () => group(mesh(new SphereGeometry(0.042 * s, 32, 20), M.chrome()), mesh(new CylinderGeometry(0.016 * s, 0.024 * s, 0.13 * s, 24), M.steel(), 0.1 * s), mesh(new CylinderGeometry(0.012 * s, 0.012 * s, 0.05 * s, 16), M.steel(), 0.19 * s)) },
    { id: p('grease'), name: 'Gemuk', sub: 'grease', cut: true, explode: [0.12 * s, 0, 0], build: () => mesh(new SphereGeometry(0.05 * s, 24, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), M.grease()) },
    { id: p('dust-boot'), name: 'Dust boot', sub: 'dust-boot', cut: true, explode: [0, 0.16 * s, 0], build: () => bellows(0.062 * s, 0.03 * s, 0.07 * s, 2, M.rubber(), 0.035 * s) },
  ];
}

const jointFailures = (prefix = ''): Record<string, FailureVisual> => {
  const p = (id: string) => (prefix ? `${prefix}-${id}` : id);
  return {
    'stud-wear': { parts: [p('ball-stud')], tint: '#f87171', move: [0.006, 0.003, 0], scale: [1, 0.94, 1], note: 'Bola aus (flat spot, ditunjukkan sebagai bola sedikit pipih) → clearance; gerak diperbesar.' },
    'socket-wear': { parts: [p('liner')], tint: '#f87171', move: [0.008, 0.006, 0], scale: [0.93, 0.93, 0.93], note: 'Liner menipis → bola bergerak di semua arah di dalam socket.' },
    'radial-play': { parts: [p('liner'), p('housing')], tint: '#f87171', move: [0.012, 0, 0], note: 'Kelonggaran radial: bola bergeser tegak lurus sumbu stud (diperbesar).' },
    'axial-play': { parts: [p('liner'), p('housing')], tint: '#f87171', move: [0, 0.012, 0], note: 'Kelonggaran aksial: stud bergerak searah sumbunya (diperbesar).' },
    'boot-torn': { parts: [p('dust-boot')], tint: '#f87171', scale: [1, 0.55, 1], note: 'Boot sobek/terlepas (ditunjukkan memendek) — clearance belum ada.' },
    'grease-loss': { parts: [p('grease')], hide: true, note: 'Gemuk hilang — gesekan naik, tidak ada clearance tambahan.' },
    contamination: { parts: [p('grease')], tint: '#5b4a3a', move: [0.003, 0.002, 0], note: 'Gemuk tercampur air/pasir (warna gelap) — keausan dipercepat.' },
    corrosion: { parts: [p('ball-stud')], tint: '#9a5b2e', note: 'Karat pada bola/stud — gesekan dan kekakuan naik.' },
    seizure: { parts: [p('ball-stud')], tint: '#9a5b2e', freeze: true, note: 'Sambungan macet — bola tidak berputar terhadap liner (stud diam).' },
    separation: { parts: [p('ball-stud')], tint: '#f87171', offset: [0, 0.07, 0], note: 'Bola tercabut dari socket — kegagalan total.' },
  };
};

/* -------------------------------- models -------------------------------- */
export const ANATOMY_MODELS: AnatomyModel[] = [
  {
    id: 'shock-absorber',
    name: 'Shock absorber twin-tube',
    sources: ['shock-absorber'],
    description: 'Piston dengan katup bergerak di tabung kerja; oli mengalir melalui katup piston (rebound/kompresi) dan base valve ke ruang reservoir. Gas bertekanan rendah di atas oli reservoir.',
    simplification: 'Penampang disederhanakan: shim katup ditampilkan sebagai cakram, lubang orifice sebagai silinder kecil. Proporsi representatif.',
    motion: 'stroke',
    moving: ['piston', 'piston-rod', 'bump-stop'],
    camera: [0.75, 0.55, 1.25],
    target: [0, 0.3, 0],
    parts: [
      { id: 'outer-tube', name: 'Tabung luar (reservoir)', sub: 'outer-tube', cut: true, explode: [-0.22, 0, 0], build: () => group(cyl(0.05, 0.44, M.yellow(), 0, true), cyl(0.05, 0.006, M.yellow(), 0)) },
      { id: 'reservoir-oil', name: 'Oli reservoir', sub: 'damper-oil', cut: true, explode: [-0.14, 0, 0], build: () => tube(0.037, 0.049, 0.24, M.oil(), 0.006) },
      { id: 'gas', name: 'Ruang gas', sub: 'damper-oil', cut: true, explode: [-0.14, 0.04, 0], build: () => tube(0.037, 0.049, 0.16, M.gas(), 0.25) },
      { id: 'pressure-tube', name: 'Tabung kerja', sub: 'pressure-tube', cut: true, explode: [0.16, 0, 0], build: () => cyl(0.036, 0.41, M.steel(), 0.01, true) },
      { id: 'working-oil', name: 'Oli tabung kerja', sub: 'damper-oil', cut: true, explode: [0.1, 0, 0], build: () => cyl(0.034, 0.4, M.oil(), 0.012) },
      { id: 'base-valve', name: 'Base valve', sub: 'valves', explode: [0, -0.12, 0], build: () => group(cyl(0.035, 0.014, M.dark(), 0.012), ...[0, 1, 2, 3].map((i) => mesh(new CylinderGeometry(0.004, 0.004, 0.02, 8), M.rubber(), 0.019, Math.cos(i * 1.57) * 0.018, Math.sin(i * 1.57) * 0.018))) },
      { id: 'piston', name: 'Piston + katup (shim stack)', sub: 'piston', explode: [0, -0.02, 0.18], build: () => group(cyl(0.034, 0.022, M.dark(), 0.2), cyl(0.028, 0.004, M.steel(), 0.222), cyl(0.024, 0.004, M.steel(), 0.226), cyl(0.028, 0.004, M.steel(), 0.194), ...[0, 1, 2, 3, 4, 5].map((i) => mesh(new CylinderGeometry(0.003, 0.003, 0.024, 8), M.rubber(), 0.211, Math.cos(i * 1.05) * 0.021, Math.sin(i * 1.05) * 0.021))) },
      { id: 'piston-rod', name: 'Batang piston', sub: 'piston-rod', explode: [0, 0.18, 0.18], build: () => cyl(0.012, 0.44, M.chrome(), 0.22, false, 24) },
      { id: 'rod-guide', name: 'Rod guide', sub: 'rod-guide', cut: true, explode: [0, 0.12, 0], build: () => tube(0.012, 0.05, 0.03, M.steel(), 0.41) },
      { id: 'oil-seal', name: 'Sil oli', sub: 'oil-seal', cut: true, explode: [0, 0.2, 0], build: () => mesh(new TorusGeometry(0.02, 0.008, 12, 32).rotateX(Math.PI / 2), M.rubber(), 0.445) },
      { id: 'bump-stop', name: 'Bump stop', sub: 'bump-stop', cut: true, explode: [0, 0.26, -0.12], build: () => tube(0.013, 0.03, 0.06, M.polymer(), 0.53) },
      { id: 'dust-boot', name: 'Dust boot', sub: 'dust-boot', cut: true, explode: [0, 0.3, 0.2], build: () => bellows(0.055, 0.045, 0.22, 6, M.rubber(), 0.46) },
      { id: 'mount-eye', name: 'Mata bawah + bushing', sub: 'mount-bushing', explode: [0, -0.2, 0], build: () => mesh(new TorusGeometry(0.025, 0.012, 12, 24), M.rubber(), -0.03) },
    ],
    failures: {
      'oil-leak': { parts: ['oil-seal', 'outer-tube'], tint: '#5a3c0c', also: [{ parts: ['reservoir-oil'], scale: [1, 0.45, 1] }, { parts: ['working-oil'], scale: [1, 0.8, 1] }], note: 'Oli merembes dari sil dan membasahi tabung; level oli turun (kolom oli memendek) sehingga piston sebagian bekerja di udara.' },
      'valve-degradation': { parts: ['piston', 'base-valve'], tint: '#f87171', note: 'Shim katup kehilangan kekakuan → oli lewat lebih mudah; gerak piston tetap, gaya redam turun.' },
      'reduced-damping': { parts: ['working-oil', 'reservoir-oil'], tint: '#e9d8a6', note: 'Oli teraerasi/panas (warna pucat) — gaya redam sementara turun.' },
      'rod-damage': { parts: ['piston-rod'], tint: '#9a5b2e', note: 'Krom tergores/berkarat — menggerus sil setiap langkah.' },
      'bent-rod': { parts: ['piston-rod'], tint: '#f87171', tilt: 0.05, note: 'Batang bengkok (kemiringan diperbesar) → gesekan di rod guide dan sil.' },
      'seal-failure': { parts: ['oil-seal'], tint: '#f87171', also: [{ parts: ['gas'], hide: true }, { parts: ['reservoir-oil', 'working-oil'], tint: '#e9d8a6' }], note: 'Tekanan gas hilang (ruang gas kosong) — oli mudah berbusa/teraerasi (warna pucat).' },
      'internal-binding': { parts: ['piston'], tint: '#f87171', motionScale: 0.25, note: 'Piston tersangkut — langkah sangat terbatas.' },
      'mount-bushing-wear': { parts: ['mount-eye'], tint: '#f87171', move: [0.008, 0, 0], note: 'Karet mata bawah aus — mata bergerak terhadap baut.' },
    },
  },
  {
    id: 'strut-mount',
    name: 'Strut mount dengan bearing',
    sources: ['strut-mount'],
    description: 'Pelat dan stud mengikat ke strut tower; isolator karet mengisolasi getaran; bearing memungkinkan dudukan per dan strut berputar saat kemudi dibelokkan.',
    simplification: 'Bearing bola ditampilkan sebagai satu baris bola di antara dua lintasan; bentuk karet disederhanakan sebagai cincin tebal.',
    motion: 'rotate',
    moving: ['strut-bearing-lower', 'upper-spring-seat', 'spring-top'],
    camera: [0.5, 0.42, 0.62],
    target: [0, 0.08, 0],
    parts: [
      { id: 'mounting-plate', name: 'Pelat dudukan & stud', sub: 'mounting-plate', explode: [0, 0.24, 0], build: () => group(cyl(0.11, 0.008, M.steel(), 0.17), ...[0, 1, 2].map((i) => mesh(new CylinderGeometry(0.006, 0.006, 0.06, 10), M.chrome(), 0.205, Math.cos(i * 2.09) * 0.085, Math.sin(i * 2.09) * 0.085))) },
      { id: 'rubber-insulator', name: 'Isolator karet', sub: 'rubber-insulator', cut: true, explode: [0, 0.15, 0], build: () => tube(0.02, 0.09, 0.06, M.rubber(), 0.11) },
      { id: 'rod-nut', name: 'Mur batang piston', sub: 'rod-nut', explode: [0, 0.32, 0], build: () => mesh(new CylinderGeometry(0.016, 0.016, 0.014, 6), M.chrome(), 0.19) },
      { id: 'strut-bearing-upper', name: 'Lintasan bearing atas', sub: 'strut-bearing', cut: true, explode: [0, 0.07, 0], build: () => tube(0.05, 0.085, 0.01, M.steel(), 0.095) },
      { id: 'strut-bearing-balls', name: 'Bola bearing', sub: 'strut-bearing', explode: [0.12, 0.04, 0], build: () => group(...Array.from({ length: 18 }, (_, i) => mesh(new SphereGeometry(0.008, 12, 8), M.chrome(), 0.088, Math.cos((i / 18) * Math.PI * 2) * 0.068, Math.sin((i / 18) * Math.PI * 2) * 0.068))) },
      { id: 'strut-bearing-lower', name: 'Lintasan bearing bawah', sub: 'strut-bearing', cut: true, explode: [0, 0, 0], build: () => tube(0.05, 0.085, 0.01, M.steel(), 0.072) },
      { id: 'upper-spring-seat', name: 'Dudukan per atas', sub: 'strut-bearing', cut: true, explode: [0, -0.08, 0], build: () => tube(0.02, 0.1, 0.01, M.dark(), 0.055) },
      { id: 'spring-top', name: 'Ujung atas per', explode: [0, -0.18, 0], build: () => { const g = new SpringGeometry(0.075, 0.01, 1.2, 0.08); return mesh(g, M.spring(), -0.03); } },
      { id: 'piston-rod', name: 'Batang piston (atas)', explode: [0, -0.14, 0.14], build: () => cyl(0.012, 0.26, M.chrome(), -0.06, false, 24) },
    ],
    failures: {
      'insulator-deterioration': { parts: ['rubber-insulator'], tint: '#6b6b6b', scale: [1, 0.85, 1], move: [0.003, 0.003, 0], note: 'Karet mengeras dan amblas (set) → gerak kecil strut terhadap bodi.' },
      'rubber-separation': { parts: ['rubber-insulator', 'mounting-plate'], tint: '#f87171', offset: [0, -0.012, 0], move: [0.008, 0.006, 0], note: 'Ikatan karet–pelat putus → celah dan gerak bebas.' },
      'bearing-wear': { parts: ['strut-bearing-balls', 'strut-bearing-lower'], tint: '#f87171', move: [0.004, 0.002, 0], note: 'Bola/lintasan aus → putaran kasar dan ketukan.' },
      'bearing-seizure': { parts: ['strut-bearing-balls', 'strut-bearing-lower', 'upper-spring-seat'], tint: '#9a5b2e', freeze: true, note: 'Bearing macet → dudukan per tidak berputar; per terpuntir saat kemudi (wind-up).' },
      'plate-damage': { parts: ['mounting-plate'], tint: '#f87171', tilt: 0.06, note: 'Pelat bengkok (kemiringan diperbesar) → posisi atas strut bergeser.' },
      'nut-loose': { parts: ['rod-nut', 'piston-rod'], tint: '#f87171', move: [0, 0.01, 0], note: 'Mur kendor → batang bergerak naik-turun terhadap mount (ketukan logam).' },
    },
  },
  {
    id: 'ball-joint',
    name: 'Ball joint / tie rod end',
    sources: ['lower-ball-joint', 'upper-ball-joint', 'outer-tie-rod-end', 'inner-tie-rod'],
    description: 'Bola baja pada stud taper berputar di dalam liner polimer yang dipreload di dalam rumah; gemuk dan boot melindungi permukaan. Konstruksi sama untuk ball joint suspensi dan tie rod end (ukuran & arah beban berbeda).',
    simplification: 'Rumah disederhanakan; tie rod end memiliki lengan rumah ke samping (ditunjukkan sebagai blok). Clearance diperbesar agar terlihat.',
    motion: 'articulate',
    moving: ['ball-stud', 'dust-boot'],
    camera: [0.42, 0.26, 0.5],
    target: [0, 0.03, 0],
    parts: jointParts(1),
    failures: jointFailures(),
  },
  {
    id: 'control-arm-bushing',
    name: 'Bushing lengan (karet-logam)',
    sources: ['control-arm-bushing', 'trailing-arm-bushing'],
    description: 'Sleeve luar dipres ke lengan; sleeve dalam dijepit baut. Saat lengan berayun, karet terpuntir (bukan berputar). Rongga (void) membuat kekakuan berbeda per arah.',
    simplification: 'Lengan (mata lengan + sleeve luar) berayun terhadap sleeve dalam yang dijepit baut; karet digambar mengikuti setengah sudut (puntiran rata-rata), bukan deformasi elastis sebenarnya.',
    motion: 'twist',
    moving: ['arm-eye', 'outer-sleeve', 'rubber'],
    camera: [0.3, 0.42, 0.42],
    target: [0, 0, 0],
    parts: [
      { id: 'arm-eye', name: 'Mata lengan', explode: [0, 0, -0.25], build: () => group(tube(0.075, 0.09, 0.08, M.dark(), -0.04), mesh(new BoxGeometry(0.06, 0.05, 0.08), M.dark(), 0, 0.12, 0)) },
      { id: 'outer-sleeve', name: 'Sleeve luar', sub: 'outer-sleeve', cut: true, explode: [0, 0, -0.12], build: () => tube(0.068, 0.075, 0.08, M.steel(), -0.04) },
      { id: 'rubber', name: 'Elemen karet bervoid', sub: 'rubber', cut: true, explode: [0, 0, 0.04], build: () => {
        const g = new Group();
        for (const [start, len] of [[0.35, 2.44], [3.49, 2.44]] as const) {
          const m = new Mesh(new CylinderGeometry(0.066, 0.066, 0.08, 32, 1, false, start, len), M.rubber());
          g.add(m);
        }
        return g;
      } },
      { id: 'inner-sleeve', name: 'Sleeve dalam', sub: 'inner-sleeve', explode: [0, 0, 0.14], build: () => tube(0.012, 0.022, 0.1, M.steel(), -0.05) },
      { id: 'bolt', name: 'Baut sumbu', explode: [0, 0, 0.26], build: () => cyl(0.011, 0.18, M.chrome(), -0.09, false, 16) },
    ],
    failures: {
      hardening: { parts: ['rubber'], tint: '#5e5e5e', note: 'Karet mengeras (warna pudar) — sudut ayun sama, tetapi torsi puntir dan getaran yang diteruskan lebih besar.' },
      cracking: { parts: ['rubber'], tint: '#f87171', move: [0.003, 0.002, 0], note: 'Retak menembus sebagian karet → kekakuan arah tertentu turun.' },
      tearing: { parts: ['rubber'], tint: '#f87171', move: [0.01, 0.006, 0], note: 'Karet sobek → sleeve dalam bergerak jauh dari tengah (diperbesar).' },
      separation: { parts: ['rubber', 'inner-sleeve'], tint: '#f87171', move: [0.012, 0.008, 0], note: 'Karet lepas dari sleeve → sleeve dalam bebas bergerak/berputar.' },
      deformation: { parts: ['inner-sleeve', 'bolt'], tint: '#f87171', offset: [0.012, 0, 0], note: 'Compression set → sleeve dalam tidak lagi di tengah (posisi lengan bergeser).' },
      'wrong-preload': { parts: ['rubber'], tint: '#f5a524', rotate: [0, 0.2, 0], also: [{ parts: ['arm-eye', 'outer-sleeve'], rotate: [0, 0.4, 0] }], note: 'Baut dikencangkan saat lengan menggantung → pada ride height lengan sudah berputar terhadap sleeve dalam dan karet terpuntir terus-menerus (sudut awal ditunjukkan).' },
      'hydro-leak': { parts: ['rubber'], tint: '#6b8fbf', move: [0.005, 0, 0], note: 'Fluida hydro-bushing keluar → peredaman hilang.' },
    },
  },
  {
    id: 'wheel-bearing',
    name: 'Hub bearing (Gen 2/3)',
    sources: ['wheel-bearing'],
    description: 'Dua baris bola kontak sudut di antara cincin luar (dibaut ke knuckle) dan cincin dalam/hub; sil di kedua sisi; cincin encoder magnet untuk sensor ABS.',
    simplification: 'Sudut kontak dan bentuk lintasan disederhanakan; cage ditampilkan sebagai cincin.',
    motion: 'rotate',
    moving: ['hub-flange', 'inner-ring', 'balls', 'abs-encoder'],
    camera: [0.5, 0.25, 0.4],
    target: [0, 0, 0],
    parts: [
      { id: 'hub-flange', name: 'Flens hub & baut roda', sub: 'hub-flange', explode: [0.24, 0, 0], build: () => { const g = group(cyl(0.11, 0.014, M.alu(), 0), ...Array.from({ length: 5 }, (_, i) => mesh(new CylinderGeometry(0.007, 0.007, 0.05, 10), M.chrome(), 0.03, Math.cos(i * 1.2566) * 0.075, Math.sin(i * 1.2566) * 0.075))); g.rotation.z = -Math.PI / 2; g.position.x = 0.07; return g; } },
      { id: 'outer-ring', name: 'Cincin luar (flens knuckle)', sub: 'races', cut: true, explode: [-0.2, 0, 0], build: () => { const g = group(tube(0.06, 0.08, 0.1, M.steel(), -0.05), tube(0.08, 0.11, 0.012, M.steel(), -0.006)); g.rotation.z = Math.PI / 2; return g; } },
      { id: 'inner-ring', name: 'Cincin dalam / poros hub', sub: 'races', cut: true, explode: [0.12, 0, 0.1], build: () => { const g = tube(0.026, 0.044, 0.12, M.steel(), -0.06); g.rotation.z = Math.PI / 2; return group(g); } },
      { id: 'balls', name: 'Bola (2 baris) + cage', sub: 'balls', explode: [0, 0.16, 0], build: () => { const g = new Group(); for (const x of [-0.025, 0.025]) for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.add(mesh(new SphereGeometry(0.0085, 12, 8), M.chrome(), Math.cos(a) * 0.052, x, Math.sin(a) * 0.052)); } return g; } },
      { id: 'seals', name: 'Sil', sub: 'seals', explode: [0, -0.15, 0], build: () => { const g = new Group(); for (const x of [-0.052, 0.052]) { const t = mesh(new TorusGeometry(0.053, 0.006, 8, 40), M.rubber()); t.rotation.y = Math.PI / 2; t.position.x = x; g.add(t); } return g; } },
      { id: 'abs-encoder', name: 'Encoder ABS', sub: 'abs-encoder', explode: [-0.12, -0.08, 0.12], build: () => { const g = new Group(); for (let i = 0; i < 24; i++) { const b = mesh(new BoxGeometry(0.006, 0.012, 0.01), i % 2 ? M.violet() : M.dark()); const a = (i / 24) * Math.PI * 2; b.position.set(-0.062, Math.cos(a) * 0.05, Math.sin(a) * 0.05); b.rotation.x = -a; g.add(b); } return g; } },
    ],
    failures: {
      spalling: { parts: ['outer-ring', 'inner-ring'], tint: '#f87171', note: 'Serpihan pada lintasan (lokasi ditandai) → bola menggelinding di permukaan kasar: dengung.' },
      'end-play': { parts: ['hub-flange', 'inner-ring', 'balls'], tint: '#f87171', move: [0.004, 0.006, 0], note: 'Preload hilang → hub dapat miring/bergeser (diperbesar).' },
      'seal-failure': { parts: ['seals'], tint: '#f87171', scale: [1, 0.7, 0.7], note: 'Sil rusak → air masuk ke lintasan.' },
      'abs-encoder': { parts: ['abs-encoder'], tint: '#f87171', note: 'Encoder retak/kotor → sinyal ABS terganggu (tidak ada perubahan mekanis).' },
      brinelling: { parts: ['outer-ring'], tint: '#f5a524', note: 'Penyok bola pada lintasan → getaran berirama.' },
    },
  },
  {
    id: 'stabilizer-link',
    name: 'Stabilizer link',
    sources: ['stabilizer-link'],
    description: 'Batang dengan sendi bola kecil di kedua ujung; stud memiliki hex untuk ditahan saat mur dikencangkan.',
    simplification: 'Kedua sendi digambar sama; panjang link dipersingkat.',
    motion: 'articulate',
    moving: ['top-ball-stud', 'top-dust-boot'],
    camera: [0.5, 0.3, 0.75],
    target: [0, 0.18, 0],
    parts: [
      ...jointParts(0.7, 'bottom'),
      { id: 'link-rod', name: 'Batang link', sub: 'link-rod', explode: [0.16, 0, 0], build: () => cyl(0.012, 0.34, M.steel(), -0.02, false, 20) },
      ...jointParts(0.7, 'top').map((p) => ({ ...p, build: () => { const o = p.build(); const g = group(o); g.position.y = 0.36; g.rotation.x = Math.PI; return g; } })),
    ],
    failures: {
      ...jointFailures('top'),
      bent: { parts: ['link-rod'], tint: '#f87171', tilt: 0.08, note: 'Link bengkok — panjang efektif berubah.' },
    },
  },
  {
    id: 'rack-pinion',
    name: 'Rack & pinion dengan rack guide',
    sources: ['rack-and-pinion'],
    description: 'Pinion heliks menggerakkan rack; rack guide (yoke) ditekan pegas dari bawah agar gigi selalu berkait tanpa celah; adjuster plug + mur pengunci mengatur preload. Sendi inner tie rod di ujung rack, dilindungi bellows.',
    simplification: 'Gigi digambar lurus (aslinya heliks); housing dipersingkat. Gerak rack sesuai keliling pinion.',
    motion: 'steer',
    moving: ['rack', 'pinion', 'inner-joint-l', 'inner-joint-r'],
    camera: [0.25, 0.45, 0.85],
    target: [0, 0, 0],
    parts: [
      { id: 'housing', name: 'Rumah rack', sub: 'rack-housing', cut: true, explode: [0, 0, -0.25], build: () => { const g = group(tube(0.03, 0.042, 0.62, M.alu(), -0.31)); g.rotation.z = Math.PI / 2; const p = cyl(0.04, 0.12, M.alu(), -0.06, true); p.position.z = -0.042; return group(g, p); } },
      { id: 'rack', name: 'Rack (batang bergigi)', sub: 'rack-gear', explode: [0, -0.02, 0.16], build: () => { const g = new Group(); const bar = cyl(0.016, 0.7, M.steel(), -0.35, false, 20); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0, 0); g.add(group(bar)); // Teeth on the face toward the pinion (−z); the rack guide presses from +z.
        for (let i = -10; i <= 10; i++) g.add(mesh(new BoxGeometry(0.008, 0.022, 0.006), M.chrome(), 0, i * 0.014, -0.017)); return g; } },
      { id: 'pinion', name: 'Pinion', sub: 'pinion-gear', explode: [0, 0.2, 0], build: () => { const g = group(cyl(0.02, 0.05, M.steel(), -0.025, false, 24), cyl(0.008, 0.17, M.steel(), 0.025, false, 12)); for (let i = 0; i < 12; i++) { const t = mesh(new BoxGeometry(0.006, 0.046, 0.008), M.chrome(), 0, Math.cos(i * 0.5236) * 0.022, Math.sin(i * 0.5236) * 0.022); t.rotation.y = -i * 0.5236; g.add(t); } g.position.z = -0.042; return g; } },
      { id: 'rack-guide', name: 'Rack guide (yoke)', sub: 'rack-guide', cut: true, explode: [0, -0.06, 0.2], build: () => { const g = group(cyl(0.022, 0.03, M.polymer(), 0)); g.rotation.x = Math.PI / 2; g.position.z = 0.045; return g; } },
      { id: 'guide-spring', name: 'Pegas rack guide', sub: 'rack-guide', explode: [0, -0.06, 0.3], build: () => { const sp = mesh(new SpringGeometry(0.014, 0.003, 4, 0.04), M.spring()); sp.rotation.x = Math.PI / 2; sp.position.z = 0.075; return group(sp); } },
      { id: 'adjuster', name: 'Adjuster plug + mur pengunci', sub: 'rack-guide', explode: [0, -0.06, 0.4], build: () => { const g = group(cyl(0.026, 0.016, M.alu(), 0), mesh(new CylinderGeometry(0.03, 0.03, 0.008, 6), M.chrome(), 0.022)); g.rotation.x = Math.PI / 2; g.position.z = 0.118; return g; } },
      { id: 'inner-joint-l', name: 'Inner tie rod kiri', sub: 'rack-gear', explode: [-0.12, 0, 0], build: () => group(mesh(new SphereGeometry(0.022, 20, 14), M.chrome(), 0, -0.37), (() => { const r = cyl(0.009, 0.14, M.steel(), -0.07, false, 12); r.rotation.z = Math.PI / 2; r.position.x = -0.44; return r; })()) },
      { id: 'inner-joint-r', name: 'Inner tie rod kanan', sub: 'rack-gear', explode: [0.12, 0, 0], build: () => group(mesh(new SphereGeometry(0.022, 20, 14), M.chrome(), 0, 0.37), (() => { const r = cyl(0.009, 0.14, M.steel(), -0.07, false, 12); r.rotation.z = Math.PI / 2; r.position.x = 0.44; return r; })()) },
      { id: 'bellows', name: 'Bellows rack', sub: 'rack-housing', cut: true, explode: [0, 0.12, -0.12], build: () => { const g = new Group(); for (const sx of [-1, 1]) { const b = bellows(0.034, 0.026, 0.1, 4, M.rubber()); b.rotation.z = sx * -Math.PI / 2; b.position.x = sx * 0.31; g.add(b); } return g; } },
    ],
    failures: {
      contamination: { parts: ['bellows', 'rack'], tint: '#9a5b2e', motionScale: 0.85, note: 'Bellows sobek → air/pasir pada rack dan gigi (karat, gesekan naik).' },
      'rack-wear': { parts: ['rack'], tint: '#f87171', note: 'Gigi rack zona tengah aus → backlash di sekitar posisi lurus.' },
      'rack-binding': { parts: ['rack'], tint: '#f87171', motionScale: 0.4, tilt: 0.01, note: 'Rack bengkok/rusak setempat → gerak tersendat.' },
      'excessive-clearance': { parts: ['rack', 'rack-guide'], tint: '#f87171', move: [0, 0, 0.006], note: 'Rack dapat menjauh dari pinion (diperbesar) → ketukan.' },
      'pinion-wear': { parts: ['pinion'], tint: '#f87171', move: [0.003, 0.004, 0], note: 'Gigi/bearing pinion aus → kelonggaran input.' },
      'guide-wear': { parts: ['rack-guide'], tint: '#f87171', offset: [0, 0, 0.006], note: 'Yoke aus → celah antara yoke dan rack.' },
      'spring-weak': { parts: ['guide-spring'], tint: '#f87171', scale: [1, 1, 0.8], note: 'Pegas lemah → preload rack ke pinion turun.' },
      'adjust-tight': { parts: ['adjuster', 'rack-guide'], tint: '#f5a524', motionScale: 0.7, note: 'Adjuster terlalu kencang → gesekan tinggi, setir berat.' },
    },
  },
  {
    id: 'eps-column',
    name: 'EPS column-assist (motor, worm gear, sensor torsi)',
    sources: ['eps-reduction', 'eps-torque-sensor', 'eps-motor'],
    description: 'Poros input dan output dihubungkan torsion bar; sensor mengukur puntirannya. Motor memutar worm yang menggerakkan roda worm pada poros output (reduksi ±15–20:1).',
    simplification: 'Sensor torsi ditampilkan sebagai dua cincin; elektronik dan housing disederhanakan.',
    motion: 'gear',
    moving: ['output-shaft', 'worm-wheel', 'worm', 'input-shaft'],
    camera: [0.5, 0.35, 0.6],
    target: [0, 0.05, 0],
    parts: [
      { id: 'input-shaft', name: 'Poros input (dari setir)', explode: [0, 0.22, 0], build: () => cyl(0.014, 0.22, M.steel(), 0.14, false, 16) },
      { id: 'torsion-bar', name: 'Torsion bar', explode: [0.14, 0.12, 0], build: () => cyl(0.005, 0.16, M.chrome(), 0.06, false, 12) },
      { id: 'torque-sensor', name: 'Sensor torsi', explode: [-0.16, 0.12, 0], build: () => group(tube(0.02, 0.034, 0.012, M.violet(), 0.12), tube(0.02, 0.034, 0.012, M.violet(), 0.14)) },
      { id: 'output-shaft', name: 'Poros output (ke pinion)', explode: [0, -0.2, 0], build: () => cyl(0.016, 0.24, M.steel(), -0.16, false, 16) },
      { id: 'worm-wheel', name: 'Roda worm (polimer)', explode: [0, 0, 0.16], build: () => { const g = group(cyl(0.065, 0.024, M.polymer(), 0, false, 48)); for (let i = 0; i < 36; i++) { const t = mesh(new BoxGeometry(0.006, 0.024, 0.008), M.polymer(), 0.012, Math.cos(i * 0.1745) * 0.068, Math.sin(i * 0.1745) * 0.068); t.rotation.y = -i * 0.1745; g.add(t); } return g; } },
      { id: 'worm', name: 'Worm (dari motor)', explode: [0.18, 0, 0], build: () => { const sp = mesh(new SpringGeometry(0.014, 0.004, 6, 0.12), M.steel(), -0.06); const core = cyl(0.011, 0.12, M.steel(), -0.06, false, 16); const inner = group(sp, core); inner.rotation.z = Math.PI / 2; const outer = group(inner); outer.position.set(0.06, 0.012, 0.081); return outer; } },
      { id: 'gear-housing', name: 'Rumah reduksi', cut: true, explode: [0, 0, -0.2], build: () => group(tube(0.088, 0.096, 0.05, M.alu(), -0.013), cyl(0.096, 0.006, M.alu(), -0.019)) },
      { id: 'motor', name: 'Motor EPS', explode: [0.32, 0, 0], build: () => { const m = cyl(0.04, 0.12, M.dark(), 0, false, 32); m.rotation.z = Math.PI / 2; m.position.set(0.18, 0.012, 0.081); return group(m); } },
    ],
    failures: {
      'worm-wear': { parts: ['worm-wheel', 'worm'], tint: '#f87171', move: [0, 0, 0.004], note: 'Gigi roda worm aus / preload worm turun → backlash, ketukan dari kolom.' },
      'torque-offset': { parts: ['torque-sensor'], tint: '#f5a524', note: 'Titik nol sensor bergeser → ECU melihat torsi yang tidak ada (mobil menarik).' },
      'torque-fault': { parts: ['torque-sensor'], tint: '#f87171', note: 'Kanal sensor tidak konsisten → ECU mematikan bantuan.' },
      'motor-fault': { parts: ['motor'], tint: '#f87171', freeze: true, note: 'Motor tidak memberi torsi; poros tetap dapat diputar manual (worm ikut berputar).' },
    },
  },
];

/** Failure modes that apply to an anatomy model (from component or steering-part data). */
export function anatomyFailures(model: AnatomyModel): FailureMode[] {
  const out: FailureMode[] = [];
  const seen = new Set<string>();
  for (const src of model.sources) {
    const list = getMechComponent(src)?.failureModes ?? findSteeringPart(src)?.part.failureModes ?? [];
    for (const f of list) {
      if (seen.has(f.id) || !model.failures[f.id]) continue;
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

/** Description of a sub-part from component data (falls back to the part name). */
export function partDescription(model: AnatomyModel, part: AnatomyPart): string | undefined {
  for (const src of model.sources) {
    const c = getMechComponent(src);
    const sc = c?.subcomponents.find((s) => s.id === part.sub);
    if (sc) return `${sc.function}${sc.construction ? ` · ${sc.construction}` : ''}`;
    const sp = findSteeringPart(part.sub ?? '')?.part;
    if (sp) return `${sp.function} · ${sp.construction}`;
  }
  return undefined;
}
