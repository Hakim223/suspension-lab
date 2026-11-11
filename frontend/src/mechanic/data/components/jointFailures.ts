import type { FailureMode, FailureSimulation } from '../types';

/**
 * Failure mechanisms of a polymer-lined ball-and-socket joint (ball joints, tie-rod ends,
 * stabilizer-link joints, inner tie-rod axial joints). The physics is the same; the
 * consequence and inspection differ per application, supplied through `ctx`.
 */
export interface JointContext {
  /** Name used in text, e.g. "ball joint bawah". */
  name: string;
  /** What excess clearance does in this application. */
  playEffect: string;
  /** Symptoms of clearance in this application. */
  playSymptoms: string[];
  /** How to load the joint during inspection. */
  playTest: string[];
  /** What looks similar and how to separate it. */
  playLookalikes: string[];
  /** What a seized joint does in this application. */
  seizureEffect: string;
  seizureSymptoms: string[];
  /** 3D simulation for clearance failures (scaled per mechanism). */
  sim?: (scale: number) => FailureSimulation;
  critical?: boolean;
}

export function jointFailures(c: JointContext): FailureMode[] {
  const sev = c.critical ? ('kritis' as const) : ('tinggi' as const);
  return [
    {
      id: 'stud-wear',
      name: 'Keausan bola (ball stud)',
      subcomponentId: 'ball-stud',
      severity: sev,
      whatFails: `Permukaan bola pada ${c.name} aus menjadi tidak bulat (flat spot) dan kasar.`,
      cause: 'Gesekan setelah pelumas hilang, partikel abrasif masuk, beban kejut berulang.',
      mechanicalEffect: `Clearance muncul terutama pada arah beban utama; ${c.playEffect}`,
      symptoms: c.playSymptoms,
      inspection: [...c.playTest, 'Bila dilepas: periksa permukaan bola dari goresan/flat spot dan rasakan gerak bola yang tidak rata'],
      differentiation: ['Keausan bola biasanya disertai keausan liner; keausan bola saja memberi clearance yang bervariasi menurut posisi sudut sambungan', ...c.playLookalikes],
      indicators: ['Clearance ≈0,5–1 mm (spesifikasi umum: 0 mm teraba)'],
      sim: c.sim?.(0.6),
    },
    {
      id: 'socket-wear',
      name: 'Keausan socket / liner',
      subcomponentId: 'liner',
      severity: sev,
      whatFails: 'Liner polimer (POM/PA) di dalam rumah sambungan aus, retak, atau terdeformasi permanen sehingga bola tidak lagi tertahan rapat.',
      cause: 'Penuaan polimer karena panas, pelumas habis, beban kejut, kontaminasi.',
      mechanicalEffect: `Clearance merata di semua arah dan bertambah cepat setelah liner retak; ${c.playEffect}`,
      symptoms: c.playSymptoms,
      inspection: [...c.playTest, 'Bila dilepas: periksa serpihan liner di gemuk'],
      differentiation: ['Clearance dari liner aus biasanya disertai bunyi “klik” lunak; bola aus memberi gerak kasar', ...c.playLookalikes],
      indicators: ['Clearance ≈1 mm'],
      sim: c.sim?.(1),
    },
    {
      id: 'radial-play',
      name: 'Kelonggaran radial berlebih',
      subcomponentId: 'housing',
      severity: sev,
      whatFails: 'Gerak bola tegak lurus sumbu stud melebihi batas — hasil gabungan keausan bola dan liner.',
      cause: 'Tahap lanjut keausan.',
      mechanicalEffect: `Bola bergeser menyamping di dalam rumah saat arah gaya berbalik; ${c.playEffect}`,
      symptoms: c.playSymptoms,
      inspection: [...c.playTest, 'Ukur dengan dial indicator pada rumah sambungan bila tersedia spesifikasi'],
      differentiation: ['Radial play terlihat saat gaya diberikan menyamping terhadap stud; axial play saat mendorong/menarik searah stud', ...c.playLookalikes],
      indicators: ['Clearance radial ≈1,5 mm'],
      sim: c.sim?.(1.5),
    },
    {
      id: 'axial-play',
      name: 'Kelonggaran aksial berlebih',
      subcomponentId: 'housing',
      severity: sev,
      whatFails: 'Bola bergerak keluar-masuk searah sumbu stud karena preload pegas/tutup hilang atau liner habis di arah aksial.',
      cause: 'Keausan, pegas preload lemah (pada desain berpegas), tutup bawah longgar.',
      mechanicalEffect: `Stud bergerak naik-turun di dalam rumah setiap kali arah beban vertikal berbalik; ${c.playEffect}`,
      symptoms: c.playSymptoms,
      inspection: [...c.playTest, 'Tuas searah sumbu stud dan amati gerak stud terhadap rumah'],
      differentiation: ['Pada sambungan yang memikul beban (load-carrying), axial play diuji dengan beban dilepas dari sambungan', ...c.playLookalikes],
      indicators: ['Clearance aksial ≈1 mm'],
      sim: c.sim?.(1),
    },
    {
      id: 'boot-torn',
      name: 'Dust boot sobek',
      subcomponentId: 'dust-boot',
      severity: 'sedang',
      whatFails: 'Karet boot retak, sobek, atau terlepas dari rumah/stud.',
      cause: 'Penuaan karet (ozon, panas), terjepit alat saat servis (garpu pemisah), batu.',
      mechanicalEffect: 'Belum ada perubahan clearance; sambungan masih presisi tetapi kini terbuka terhadap air dan kotoran.',
      symptoms: ['Belum ada gejala berkendara'],
      inspection: ['Periksa boot seluruh keliling (putar roda/setir untuk melihat sisi belakang)', 'Tekan boot: gemuk keluar menandakan sobek'],
      differentiation: ['Boot sobek tanpa clearance → ganti sambungan sebelum aus (boot terpisah jarang tersedia)'],
      visualNote: 'Boot sobek tidak mengubah geometri; tidak ada gerakan tambahan yang benar untuk ditampilkan.',
    },
    {
      id: 'grease-loss',
      name: 'Kehilangan pelumas',
      subcomponentId: 'grease',
      severity: 'sedang',
      whatFails: 'Gemuk keluar atau mengering di antara bola dan liner.',
      cause: 'Boot sobek, panas, sambungan “sealed for life” yang sudah tua.',
      mechanicalEffect: 'Gesekan dan torsi putar sambungan naik; keausan liner dan bola dipercepat.',
      symptoms: ['Decit/kriet saat suspensi bekerja di kecepatan rendah', 'Kemudi sedikit lebih berat (bila sambungan kemudi)'],
      inspection: ['Periksa bekas gemuk di sekitar boot', 'Dengarkan dengan stetoskop sambil menggoyang bodi'],
      differentiation: ['Decit karet bushing kering berbeda nada; semprot air ke sambungan untuk isolasi sumber bunyi'],
      visualNote: 'Gesekan tambahan tidak mengubah posisi komponen; dijelaskan sebagai indikator.',
      indicators: ['Torsi putar sambungan naik'],
    },
    {
      id: 'contamination',
      name: 'Kontaminasi (air / pasir)',
      subcomponentId: 'grease',
      severity: 'tinggi',
      whatFails: 'Air dan partikel abrasif masuk melalui boot yang rusak dan bercampur dengan gemuk.',
      cause: 'Boot sobek, jalan banjir/berlumpur, pencucian bertekanan tinggi ke sambungan.',
      mechanicalEffect: 'Campuran abrasif mempercepat keausan bola dan liner berkali lipat; clearance berkembang dalam waktu singkat.',
      symptoms: ['Bunyi gemeretak halus', 'Lalu gejala clearance'],
      inspection: ['Periksa isi boot: gemuk berwarna kelabu/berpasir atau berair', 'Ukur clearance'],
      differentiation: ['Kontaminasi adalah penyebab; clearance adalah akibat — catat keduanya'],
      indicators: ['Clearance berkembang ≈0,5 mm'],
      sim: c.sim?.(0.5),
    },
    {
      id: 'corrosion',
      name: 'Korosi',
      subcomponentId: 'ball-stud',
      severity: 'sedang',
      whatFails: 'Karat pada bola, rumah, taper stud atau ulir.',
      cause: 'Air dan garam.',
      mechanicalEffect: 'Permukaan bola kasar menambah gesekan dan merusak liner; taper stud berkarat menyulitkan pelepasan dan dapat longgar pada bore.',
      symptoms: ['Kemudi/suspensi kaku dan berbunyi', 'Masalah servis (stud berputar saat melepas mur)'],
      inspection: ['Periksa karat pada stud dan rumah', 'Periksa apakah stud berputar di taper knuckle'],
      differentiation: ['Stud yang berputar di bore taper menandakan bore aus — knuckle/lengan juga perlu diperiksa'],
      visualNote: 'Korosi tidak menggeser komponen; efeknya adalah gesekan/kekakuan (indikator).',
    },
    {
      id: 'seizure',
      name: 'Sambungan macet (seized)',
      subcomponentId: 'ball-stud',
      severity: 'tinggi',
      whatFails: 'Bola tidak lagi berputar bebas di liner karena korosi atau liner yang membengkak.',
      cause: 'Korosi tahap lanjut, kontaminasi, liner rusak oleh panas.',
      mechanicalEffect: c.seizureEffect,
      symptoms: c.seizureSymptoms,
      inspection: ['Lepas sambungan dari pasangannya dan putar/ayun stud dengan tangan atau kunci torsi', 'Bandingkan torsi putar dengan sambungan baru'],
      differentiation: ['Bearing strut mount macet dan caster salah juga menyebabkan setir tidak kembali — isolasi dengan melepas sambungan'],
      visualNote: 'Sambungan yang macet tidak bergerak berlebih; perubahannya adalah gaya/torsi (dijelaskan sebagai indikator).',
      indicators: ['Torsi putar sambungan ≫ spesifikasi'],
    },
  ];
}

/** Standard subcomponents of a ball-and-socket joint. */
export const jointSubcomponents = (extra: Array<{ id: string; name: string; term?: string; function: string; construction?: string }> = []) => [
  { id: 'ball-stud', name: 'Ball stud', term: 'Ball stud', function: 'Bola baja dengan stud taper yang mengunci ke pasangan (knuckle/lengan).', construction: 'Baja dikeraskan, bola dipoles' },
  { id: 'liner', name: 'Liner / socket', term: 'Bearing liner / socket', function: 'Mangkuk polimer tempat bola berputar dengan gesekan rendah dan sedikit preload.', construction: 'POM / PA' },
  { id: 'housing', name: 'Rumah sambungan', term: 'Housing', function: 'Menahan liner dan bola; dikunci rol/dipres.', construction: 'Baja tempa' },
  { id: 'grease', name: 'Gemuk', term: 'Grease', function: 'Pelumasan dan perlindungan korosi.', construction: 'Gemuk lithium/sintetis' },
  { id: 'dust-boot', name: 'Dust boot + ring', term: 'Dust boot & retaining ring', function: 'Menahan gemuk dan mencegah kontaminasi.', construction: 'Karet CR/polyurethane' },
  ...extra,
];
