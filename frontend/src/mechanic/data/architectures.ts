import type { ArchitectureTech } from './types';

export const ARCHITECTURES: ArchitectureTech[] = [
  {
    id: 'macpherson',
    layout: 'Independen depan. Strut struktural (shock + per + mount) menggantikan lengan atas; satu lengan bawah (A-arm atau I-arm + tension rod). Sumbu kemudi: ball joint bawah → bearing strut mount.',
    loadPath: [
      'Beban vertikal: ban → hub → knuckle → per pada strut → strut mount → strut tower.',
      'Gaya lateral & longitudinal bawah: knuckle → ball joint bawah → lengan bawah → bushing → subframe.',
      'Gaya lateral atas: knuckle → tabung strut (momen lentur) → rod guide → mount. Inilah sebab gesekan strut lebih tinggi dari shock biasa.',
      'Gaya kemudi: rack → tie rod → lengan kemudi knuckle.',
    ],
    kinematics: [
      'Lower arm berayun pada sumbu bushing; puncak strut tetap di mount → knuckle berputar sedikit (φ) saat bump; camber gain kecil dan dapat berbalik positif pada bump besar.',
      'Sudut kemudi diselesaikan dari panjang tie rod yang konstan: Ackermann dan bump steer muncul dari geometri (diuji otomatis).',
      'SAI ≈ 8–14°; scrub radius kecil/negatif membantu stabilitas saat rem split-µ.',
    ],
    serviceNotes: [
      'Penggantian strut memerlukan kompresor per; jangan melepas mur batang piston saat per masih tertekan.',
      'Baut strut-knuckle eksentrik (bila ada) mengubah camber — tandai posisi sebelum membongkar.',
      'Spooring wajib setelah penggantian strut, lengan, atau tie rod.',
    ],
    assemblies: [
      { assembly: 'spring-damper', components: [
        { componentId: 'strut-assembly', role: 'Strut struktural: penopang beban dan pemandu atas knuckle.' },
        { componentId: 'shock-absorber', role: 'Shock di dalam tabung strut; tabung menahan momen lentur.' },
        { componentId: 'coil-spring', role: 'Melingkari strut; ujung atas berputar melalui bearing saat kemudi.' },
        { componentId: 'strut-mount', role: 'Dudukan atas pada strut tower; bearing menjadi titik atas sumbu kemudi.' },
      ] },
      { assembly: 'links', components: [
        { componentId: 'lower-control-arm', role: 'Satu-satunya lengan; menahan gaya lateral/longitudinal bawah.', note: '1 per sisi' },
        { componentId: 'tension-rod', role: 'Pada varian lengan-I: menahan gaya longitudinal.', note: 'Hanya pada sebagian kendaraan; tidak ada di model 3D' },
      ] },
      { assembly: 'joints', components: [
        { componentId: 'lower-ball-joint', role: 'Titik bawah sumbu kemudi; follower (beban vertikal lewat strut).' },
        { componentId: 'control-arm-bushing', role: 'Dua bushing lengan bawah ke subframe (depan: lateral, belakang: longitudinal/hidraulik).' },
      ] },
      { assembly: 'stabilizer', components: [
        { componentId: 'stabilizer-bar', role: 'Bar depan di subframe.' },
        { componentId: 'stabilizer-link', role: 'Link ke tabung strut (umum) — ikut berputar saat kemudi.' },
      ] },
      { assembly: 'wheel-hub', components: [
        { componentId: 'steering-knuckle', role: 'Knuckle dengan bracket strut (2 baut) dan lengan kemudi.' },
        { componentId: 'wheel-bearing', role: 'Bearing Gen 2/3 dibaut atau Gen 1 dipres.' },
        { componentId: 'wheel-tire', role: 'Roda depan (steer + traksi pada FWD).' },
      ] },
      { assembly: 'steering-linkage', components: [
        { componentId: 'rack-and-pinion', role: 'Rack di belakang poros roda (lengan kemudi menghadap belakang).' },
        { componentId: 'inner-tie-rod', role: 'Sendi aksial di ujung rack.' },
        { componentId: 'outer-tie-rod-end', role: 'Sendi bola ke lengan kemudi knuckle.' },
        { componentId: 'rack-mount-bushing', role: 'Mengikat rumah rack ke subframe.' },
        { componentId: 'steering-shaft', role: 'Poros antara dengan U-joint ke pinion.' },
      ] },
    ],
  },
  {
    id: 'double-wishbone',
    layout: 'Independen depan dengan lengan atas pendek dan lengan bawah panjang (SLA). Per + shock bertumpu di lengan bawah; sumbu kemudi: ball joint bawah → ball joint atas.',
    loadPath: [
      'Beban vertikal: knuckle → ball joint bawah (load-carrying) → lengan bawah → per → rangka.',
      'Gaya lateral terbagi pada lengan atas dan bawah sebagai pasangan gaya; shock tidak menahan gaya samping.',
      'Gaya kemudi: rack → tie rod → lengan kemudi.',
    ],
    kinematics: [
      'Posisi ball joint atas diselesaikan dari dua lingkaran (panjang lengan atas dan jarak antar ball joint) — semua panjang dijaga konstan.',
      'Lengan atas lebih pendek → camber negatif bertambah saat bump (kompensasi roll).',
      'Motion ratio per/shock < 1 karena dipasang di tengah lengan bawah.',
    ],
    serviceNotes: [
      'Ball joint bawah pada desain ini memikul beban: uji kelonggaran dengan dongkrak di bawah lengan bawah.',
      'Camber/caster disetel dengan shim atau cam pada lengan atas (tergantung desain).',
    ],
    assemblies: [
      { assembly: 'spring-damper', components: [
        { componentId: 'coil-spring', role: 'Di antara lengan bawah dan kantong per rangka.' },
        { componentId: 'shock-absorber', role: 'Di dalam per; ujung atas melewati celah lengan atas ke rangka.' },
      ] },
      { assembly: 'links', components: [
        { componentId: 'upper-control-arm', role: 'Lengan atas pendek; penyetelan camber/caster.' },
        { componentId: 'lower-control-arm', role: 'Lengan bawah panjang; dudukan per dan shock.' },
        { componentId: 'tension-rod', role: 'Pada varian lengan bawah tipe-I.', note: 'Hanya pada sebagian kendaraan' },
      ] },
      { assembly: 'joints', components: [
        { componentId: 'lower-ball-joint', role: 'Load-carrying joint.' },
        { componentId: 'upper-ball-joint', role: 'Follower joint.' },
        { componentId: 'control-arm-bushing', role: 'Empat bushing (dua per lengan).' },
      ] },
      { assembly: 'stabilizer', components: [
        { componentId: 'stabilizer-bar', role: 'Bar depan.' },
        { componentId: 'stabilizer-link', role: 'Link ke lengan bawah.' },
      ] },
      { assembly: 'wheel-hub', components: [
        { componentId: 'steering-knuckle', role: 'Knuckle tinggi (C-shape) dijepit dua ball joint.' },
        { componentId: 'wheel-bearing', role: 'Hub bearing.' },
        { componentId: 'wheel-tire', role: 'Roda depan.' },
      ] },
      { assembly: 'steering-linkage', components: [
        { componentId: 'rack-and-pinion', role: 'Rack di belakang poros roda.' },
        { componentId: 'inner-tie-rod', role: 'Sendi aksial di ujung rack.' },
        { componentId: 'outer-tie-rod-end', role: 'Sendi ke lengan kemudi.' },
        { componentId: 'rack-mount-bushing', role: 'Dudukan rack ke rangka/crossmember.' },
        { componentId: 'steering-shaft', role: 'Poros antara + U-joint.' },
      ] },
    ],
  },
  {
    id: 'torsion-beam',
    layout: 'Semi-independen belakang: dua trailing arm disatukan balok puntir; per dan shock terpisah.',
    loadPath: [
      'Beban vertikal: hub → ujung lengan → per → bodi.',
      'Gaya longitudinal: lengan → bushing pivot → bodi.',
      'Gaya lateral: lengan/balok → bushing pivot (tidak ada link lateral) — karena itu bushing pivot menentukan kekakuan lateral dan compliance steer.',
    ],
    kinematics: [
      'Heave: kedua lengan berputar bersama pada sumbu pivot (α sama) — balok tidak terpuntir.',
      'Roll: α kiri ≠ kanan; segmen balok diinterpolasi sehingga puntiran terlihat (garis biru).',
      'Camber/toe ditentukan flens stub axle; umumnya tidak dapat disetel.',
    ],
    serviceNotes: [
      'Bushing pivot adalah titik aus utama; ganti berpasangan dan kencangkan pada ride height.',
      'Thrust angle salah setelah benturan → periksa flens stub axle dan balok.',
    ],
    assemblies: [
      { assembly: 'axle-structure', components: [
        { componentId: 'torsion-beam', role: 'Balok puntir + lengan terintegrasi.' },
      ] },
      { assembly: 'links', components: [
        { componentId: 'trailing-arm', role: 'Bagian dari rakitan beam; membawa stub axle.' },
      ] },
      { assembly: 'joints', components: [
        { componentId: 'trailing-arm-bushing', role: 'Dua bushing pivot ke bodi — satu-satunya titik pasang rakitan.' },
      ] },
      { assembly: 'spring-damper', components: [
        { componentId: 'coil-spring', role: 'Di atas lengan, dekat balok.' },
        { componentId: 'shock-absorber', role: 'Terpisah, di belakang poros roda.' },
      ] },
      { assembly: 'wheel-hub', components: [
        { componentId: 'wheel-bearing', role: 'Hub bearing pada stub axle.' },
        { componentId: 'wheel-tire', role: 'Roda belakang.' },
      ] },
    ],
  },
  {
    id: 'multi-link',
    layout: 'Independen belakang dengan link terpisah: dua link atas, lengan bawah (spring link), toe link dan trailing link.',
    loadPath: [
      'Beban vertikal: hub carrier → lengan bawah → per → subframe; shock langsung dari carrier.',
      'Gaya lateral: link atas & lengan bawah (pasangan gaya) → subframe.',
      'Gaya longitudinal: trailing link.',
      'Kontrol toe: toe link.',
    ],
    kinematics: [
      'Penyederhanaan model: link atas berbagi satu garis pivot efektif dan link bawah satu garis lain, sehingga carrier bergerak seperti SLA dan semua panjang link konstan (diuji).',
      'Pada desain nyata, sudut link yang tidak sejajar menghasilkan perubahan toe/camber terkendali (elastokinematics) — tidak dimodelkan.',
    ],
    serviceNotes: [
      'Periksa setiap bushing link satu per satu; satu link yang aus memengaruhi toe/camber.',
      'Penyetel camber/toe sering berkarat — uji sebelum spooring.',
    ],
    assemblies: [
      { assembly: 'links', components: [
        { componentId: 'multilink-lateral-links', role: 'Dua link atas (camber link) — garis pivot atas.', note: '2 per sisi' },
        { componentId: 'lower-control-arm', role: 'Lengan bawah / spring link, dudukan per.' },
        { componentId: 'toe-link', role: 'Mengontrol toe roda belakang.' },
        { componentId: 'trailing-arm', role: 'Trailing link — gaya longitudinal.' },
      ] },
      { assembly: 'joints', components: [
        { componentId: 'control-arm-bushing', role: 'Bushing di setiap ujung link (±10 per sisi).' },
      ] },
      { assembly: 'spring-damper', components: [
        { componentId: 'coil-spring', role: 'Di lengan bawah, terpisah dari shock.' },
        { componentId: 'shock-absorber', role: 'Dari hub carrier ke bodi.' },
      ] },
      { assembly: 'stabilizer', components: [
        { componentId: 'stabilizer-bar', role: 'Bar belakang.' },
        { componentId: 'stabilizer-link', role: 'Link ke hub carrier.' },
      ] },
      { assembly: 'wheel-hub', components: [
        { componentId: 'steering-knuckle', role: 'Hub carrier (tidak dibelokkan oleh setir).' },
        { componentId: 'wheel-bearing', role: 'Hub bearing.' },
        { componentId: 'wheel-tire', role: 'Roda belakang.' },
      ] },
    ],
  },
  {
    id: 'rigid-axle',
    layout: 'Dependen belakang: poros kaku dengan per keong, empat link membujur (2 atas, 2 bawah) dan Panhard rod.',
    loadPath: [
      'Beban vertikal: poros → per → bodi.',
      'Gaya longitudinal & reaksi torsi poros: link bawah dan atas (pasangan gaya).',
      'Gaya lateral: Panhard rod.',
    ],
    kinematics: [
      'Heave: posisi longitudinal dan pitch poros diselesaikan agar kedua pasang link konstan panjangnya.',
      'Roll: poros miring; Panhard menjaga panjangnya sehingga poros bergeser lateral sedikit.',
      '4-link + Panhard secara kinematis over-constrained saat roll — bushing link berdefleksi (model menunjukkan perubahan panjang < 12 mm).',
    ],
    serviceNotes: [
      'Bushing link dan Panhard: kencangkan pada ride height dengan kendaraan bertumpu roda.',
      'Pada penggerak belakang, bedakan bunyi gardan/bearing as roda dari bunyi suspensi.',
    ],
    assemblies: [
      { assembly: 'axle-structure', components: [
        { componentId: 'axle-housing', role: 'Poros kaku (dengan gardan pada RWD).' },
      ] },
      { assembly: 'links', components: [
        { componentId: 'trailing-arm', role: 'Empat link membujur (2 atas, 2 bawah).', note: '4 buah' },
        { componentId: 'panhard-rod', role: 'Lokasi lateral poros.' },
      ] },
      { assembly: 'joints', components: [
        { componentId: 'trailing-arm-bushing', role: 'Bushing di ujung link dan Panhard.' },
      ] },
      { assembly: 'spring-damper', components: [
        { componentId: 'coil-spring', role: 'Di atas poros.' },
        { componentId: 'shock-absorber', role: 'Dari poros ke bodi.' },
      ] },
      { assembly: 'wheel-hub', components: [
        { componentId: 'wheel-bearing', role: 'Bearing as roda di ujung poros.' },
        { componentId: 'wheel-tire', role: 'Roda belakang.' },
      ] },
    ],
  },
];
